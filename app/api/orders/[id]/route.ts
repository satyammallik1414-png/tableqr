import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { orderStatusSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;
    const body = await request.json();
    const parsed = orderStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { status } = parsed.data;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      lastUpdatedAt: now,
    };

    if (status === "PREPARING") {
      if (!existingOrder.acceptedAt) {
        updateData.acceptedAt = now;
      }
      const prepMinutes = (body as any).estimatedReadyMinutes || existingOrder.estimatedReadyMinutes || 15;
      updateData.estimatedReadyMinutes = prepMinutes;
      if (!existingOrder.estimatedReadyAt) {
        updateData.estimatedReadyAt = new Date(now.getTime() + prepMinutes * 60000);
      }
    } else if (status === "CANCELLED") {
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

      if (!existingOrder.cancelledAt) {
        updateData.cancelledAt = now;
      }
      if (body.cancellationReason) {
        updateData.cancellationReason = body.cancellationReason;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: { orderItems: true, table: true },
      });

      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { status },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          note: body.note || `Status changed to ${status}`,
          changedBy: session?.user?.name || session?.user?.id || "Staff",
        },
      });

      if ((status === "SERVED" || status === "COMPLETED" || status === "CANCELLED") && existingOrder?.tableId) {
        const otherOrders = await tx.order.count({
          where: {
            tableId: existingOrder.tableId,
            id: { not: id },
            status: { in: ["PENDING", "RECEIVED", "PREPARING", "READY"] },
          },
        });

        if (otherOrders === 0) {
          await tx.table.update({
            where: { id: existingOrder.tableId },
            data: { status: "AVAILABLE", currentOrderId: null },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 },
    );
  }
}
