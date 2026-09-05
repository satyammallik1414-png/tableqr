import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { orderStatusUpdateSchema } from "@/lib/validations";
import { ORDER_STATUS_FLOW } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order reference is required" },
        { status: 400 }
      );
    }

    // Lookup either by orderNumber or id
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            restaurant: {
              select: {
                id: true,
                name: true,
                phone: true,
                logo: true,
                currency: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Calculate server-side elapsed minutes since submission
    const now = new Date();
    const submittedTime = new Date(order.submittedAt).getTime();
    const elapsedMinutes = Math.floor((now.getTime() - submittedTime) / 60000);
    const isPendingTimeout = order.status === "PENDING" && elapsedMinutes >= 10;

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        orderType: order.orderType,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        notes: order.notes,
        submittedAt: order.submittedAt,
        acceptedAt: order.acceptedAt,
        estimatedReadyMinutes: order.estimatedReadyMinutes,
        estimatedReadyAt: order.estimatedReadyAt,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        lastUpdatedAt: order.lastUpdatedAt,
        serverCurrentTime: now.toISOString(),
        elapsedMinutes,
        isPendingTimeout,
        table: order.table,
        restaurant: order.branch?.restaurant,
        branch: {
          id: order.branch?.id,
          name: order.branch?.name,
          phone: order.branch?.phone,
        },
        statusHistory: order.statusHistory,
      },
    });
  } catch (error) {
    console.error("Fetch order status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order status" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    const body = await request.json();

    const parseResult = orderStatusUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || "Invalid status update data" },
        { status: 400 }
      );
    }

    const { status: nextStatus, estimatedReadyMinutes, cancellationReason, note } = parseResult.data;

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        branch: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Role-based business scoping
    const userRole = session.user.role;
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes((userRole ?? "").toUpperCase());
    if (!isSuperAdmin && session.user.restaurantId && existingOrder.branch.restaurantId !== session.user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Cannot update orders for another restaurant." },
        { status: 403 }
      );
    }

    // Validate Status Transition
    const allowedTransitions = ORDER_STATUS_FLOW[existingOrder.status] || [];
    if (existingOrder.status !== nextStatus && !allowedTransitions.includes(nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid transition from ${existingOrder.status} to ${nextStatus}.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: nextStatus,
      lastUpdatedAt: now,
    };

    let historyNote = note || `Status updated from ${existingOrder.status} to ${nextStatus}`;

    if (nextStatus === "PREPARING") {
      const prepMinutes = estimatedReadyMinutes || 15;
      const readyAt = new Date(now.getTime() + prepMinutes * 60000);
      updateData.acceptedAt = now;
      updateData.estimatedReadyMinutes = prepMinutes;
      updateData.estimatedReadyAt = readyAt;
      historyNote = `Order accepted. Estimated cooking time: ${prepMinutes} mins`;
    } else if (nextStatus === "CANCELLED") {
      if (!cancellationReason) {
        return NextResponse.json(
          { success: false, error: "Cancellation reason is required to cancel an order." },
          { status: 400 }
        );
      }
      updateData.cancelledAt = now;
      updateData.cancellationReason = cancellationReason;
      historyNote = `Order cancelled. Reason: ${cancellationReason}`;
    }

    // Atomic transaction for order update, status history, and table status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: existingOrder.id },
        data: updateData,
      });

      // Update OrderItem statuses
      await tx.orderItem.updateMany({
        where: { orderId: existingOrder.id },
        data: { status: nextStatus },
      });

      // Create history record
      await tx.orderStatusHistory.create({
        data: {
          orderId: existingOrder.id,
          status: nextStatus,
          note: historyNote,
          changedBy: session.user?.name || session.user?.id || "Staff",
        },
      });

      // Free table if cancelled or completed
      if (
        (nextStatus === "CANCELLED" || nextStatus === "COMPLETED") &&
        existingOrder.tableId
      ) {
        // Check if there are other active orders on this table
        const otherActiveOrders = await tx.order.count({
          where: {
            tableId: existingOrder.tableId,
            id: { not: existingOrder.id },
            status: { in: ["PENDING", "RECEIVED", "PREPARING", "READY", "SERVED"] },
          },
        });

        if (otherActiveOrders === 0) {
          await tx.table.update({
            where: { id: existingOrder.tableId },
            data: {
              status: "AVAILABLE",
              currentOrderId: null,
            },
          });
        }
      }

      return order;
    });

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${nextStatus}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
