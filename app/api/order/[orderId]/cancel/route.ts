import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = (body?.reason || "Cancelled by customer").toString().trim();

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

    if (existingOrder.status === "CANCELLED") {
      return NextResponse.json({
        success: true,
        message: "Order is already cancelled",
        order: existingOrder,
      });
    }

    if (existingOrder.status === "SERVED" || existingOrder.status === "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: "This order has already been served or completed and cannot be cancelled.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          lastUpdatedAt: now,
          cancellationReason: reason,
        },
      });

      // Update OrderItems
      await tx.orderItem.updateMany({
        where: { orderId: existingOrder.id },
        data: { status: "CANCELLED" },
      });

      // Log status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: existingOrder.id,
          status: "CANCELLED",
          note: `Order cancelled by customer. Reason: ${reason}`,
          changedBy: existingOrder.customerName || "Customer",
        },
      });

      // Free table if cancelled and no other active orders exist
      if (existingOrder.tableId) {
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
            data: { status: "AVAILABLE" },
          });
        }
      }

      return order;
    });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (err: unknown) {
    console.error("Customer cancel order error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to cancel order",
      },
      { status: 500 }
    );
  }
}
