import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { orderStatusUpdateSchema } from "@/lib/validations";
import { ORDER_STATUS_FLOW } from "@/lib/constants";
import { getPaymentProvider } from "@/lib/payments";

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
        bills: {
          select: {
            id: true,
            billNumber: true,
            subtotal: true,
            taxAmount: true,
            serviceCharge: true,
            total: true,
            paymentMethod: true,
            paymentStatus: true,
            paidAt: true,
            notes: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Retrieve restaurant payment configuration
    const restaurantId = order.branch?.restaurant?.id;
    let paymentSettings = {
      collectPaymentUpfront: false,
      upiEnabled: true,
      upiId: "smartserve@upi",
      payeeName: order.branch?.restaurant?.name || "SmartServe Restaurant",
      qrImageUrl: "",
      qrDisplayMode: "DYNAMIC",
      cashEnabled: true,
      cardEnabled: true,
    };

    if (restaurantId) {
      const settingRecord = await prisma.platformSetting.findUnique({
        where: { key: `settings_${restaurantId}` },
      });
      const rawPayment = (settingRecord?.value as any)?.payment;
      if (rawPayment) {
        paymentSettings = {
          ...paymentSettings,
          ...rawPayment,
        };
      }
    }

    const latestBill = order.bills?.[0];
    const paymentStatus = order.paymentStatus;
    const paymentMethod = latestBill?.paymentMethod || "CASH";
    const paidAt = latestBill?.paidAt || null;
    const paymentNotes = latestBill?.notes || null;

    // Calculate server-side elapsed minutes since submission
    const now = new Date();
    const submittedTime = new Date(order.submittedAt).getTime();
    const elapsedMinutes = Math.floor((now.getTime() - submittedTime) / 60000);
    const isPendingTimeout = order.status === "PENDING" && elapsedMinutes >= 10;

    // The accepted preparation timer is authoritative. At zero, finish the order.
    const readyTimestamp = order.estimatedReadyAt
      ? new Date(order.estimatedReadyAt).getTime()
      : order.acceptedAt && order.estimatedReadyMinutes
      ? new Date(order.acceptedAt).getTime() + order.estimatedReadyMinutes * 60000
      : null;

    if (
      readyTimestamp &&
      now.getTime() >= readyTimestamp &&
      (order.status === "PREPARING" || order.status === "RECEIVED" || order.status === "READY")
    ) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "COMPLETED", lastUpdatedAt: now },
        });
        await tx.orderItem.updateMany({
          where: { orderId: order.id },
          data: { status: "COMPLETED" },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "COMPLETED",
            note: "Preparation countdown completed. Order completed automatically.",
            changedBy: "System (Auto-Timer)",
          },
        });
        if (order.tableId) {
          const otherActiveOrders = await tx.order.count({
            where: { tableId: order.tableId, id: { not: order.id }, status: { in: ["PENDING", "ACCEPTED", "RECEIVED", "PREPARING", "READY", "SERVED"] } },
          });
          if (otherActiveOrders === 0) await tx.table.update({ where: { id: order.tableId }, data: { status: "AVAILABLE", currentOrderId: null } });
        }
      });
      order.status = "COMPLETED";
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus,
        paymentProvider: order.paymentProvider,
        gatewayOrderId: order.gatewayOrderId,
        paymentReceipt: order.paymentReceipt,
        paymentMethod,
        paidAt,
        paymentNotes,
        paymentSettings,
        bill: latestBill || null,
        orderType: order.orderType,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        platformFee: order.serviceCharge,
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
    if (!isSuperAdmin && existingOrder.branch.restaurantId !== session.user.restaurantId) {
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

    if (nextStatus === "ACCEPTED") {
      const prepMinutes = estimatedReadyMinutes || 15;
      updateData.acceptedAt = now;
      updateData.estimatedReadyMinutes = prepMinutes;
      updateData.estimatedReadyAt = null;
      if (existingOrder.paymentStatus === "NOT_REQUIRED") {
        updateData.status = "PREPARING";
        updateData.estimatedReadyAt = new Date(now.getTime() + prepMinutes * 60000);
        historyNote = `Order accepted. No online payment required. Cooking time: ${prepMinutes} mins`;
      } else {
        if (!existingOrder.gatewayOrderId) {
          const receipt = `order_${existingOrder.id}`.slice(0, 40);
          const gatewayOrder = await getPaymentProvider(existingOrder.paymentProvider || "razorpay").createOrder({
            amountPaise: Math.round(existingOrder.total * 100),
            receipt,
            notes: { smartserveOrderId: existingOrder.id, orderNumber: existingOrder.orderNumber || existingOrder.id },
          });
          updateData.gatewayOrderId = gatewayOrder.id;
          updateData.paymentReceipt = receipt;
          updateData.paymentInitiatedAt = now;
        }
        updateData.paymentStatus = "PENDING";
        historyNote = `Order accepted. Waiting for verified customer payment. Estimated preparation: ${prepMinutes} mins`;
      }
    } else if (nextStatus === "PREPARING") {
      if (existingOrder.paymentStatus !== "PAID" && existingOrder.paymentStatus !== "NOT_REQUIRED") {
        return NextResponse.json({ success: false, error: "Verified payment is required before preparation can start." }, { status: 409 });
      }
      const prepMinutes = existingOrder.estimatedReadyMinutes || estimatedReadyMinutes || 15;
      updateData.estimatedReadyAt = new Date(now.getTime() + prepMinutes * 60000);
    } else if (nextStatus === "CANCELLED") {
      const readyTimestamp = existingOrder.estimatedReadyAt
        ? new Date(existingOrder.estimatedReadyAt).getTime()
        : existingOrder.acceptedAt && existingOrder.estimatedReadyMinutes
        ? new Date(existingOrder.acceptedAt).getTime() + existingOrder.estimatedReadyMinutes * 60000
        : null;

      const isTimeFinished = readyTimestamp !== null && now.getTime() >= readyTimestamp;

      if (existingOrder.status === "READY" || isTimeFinished) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot cancel order: preparation time has completed and order is ready.",
          },
          { status: 400 }
        );
      }

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
    const persistedStatus = String(updateData.status || nextStatus) as typeof nextStatus;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: existingOrder.id },
        data: updateData,
      });

      // Update OrderItem statuses
      await tx.orderItem.updateMany({
        where: { orderId: existingOrder.id },
        data: { status: persistedStatus },
      });

      // Create history record
      await tx.orderStatusHistory.create({
        data: {
          orderId: existingOrder.id,
          status: persistedStatus,
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
            status: { in: ["PENDING", "ACCEPTED", "RECEIVED", "PREPARING", "READY", "SERVED"] },
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
