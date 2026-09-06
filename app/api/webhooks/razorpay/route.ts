import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature") || "";
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const event = JSON.parse(raw);
  const entity = event?.payload?.payment?.entity;
  if (!entity?.order_id) return NextResponse.json({ received: true });
  const order = await prisma.order.findUnique({ where: { gatewayOrderId: entity.order_id }, include: { bills: { orderBy: { createdAt: "desc" }, take: 1 }, branch: true } });
  if (!order || order.paymentStatus === "PAID") return NextResponse.json({ received: true });
  if (event.event === "payment.failed") await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED", paymentFailureReason: entity.error_description || "Gateway reported failure" } });
  if (event.event === "payment.captured" && order.status === "ACCEPTED" && entity.amount === Math.round(order.total * 100)) {
    const now = new Date();
    const readyAt = new Date(now.getTime() + (order.estimatedReadyMinutes || 15) * 60000);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({ where: { id: order.id, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID", gatewayPaymentId: entity.id, paidAt: now, status: "PREPARING", estimatedReadyAt: readyAt, lastUpdatedAt: now, paymentFailureReason: null } });
      if (!updated.count) return;
      await tx.bill.updateMany({ where: { orderId: order.id }, data: { paymentStatus: "PAID", paymentMethod: "RAZORPAY", paidAt: now } });
      if (order.bills[0]) await tx.payment.create({ data: { billId: order.bills[0].id, restaurantId: order.branch.restaurantId, method: "RAZORPAY", amount: order.total, reference: entity.id, status: "PAID" } });
      await tx.orderItem.updateMany({ where: { orderId: order.id }, data: { status: "PREPARING" } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "PREPARING", note: "Payment captured and verified by Razorpay webhook.", changedBy: "Razorpay webhook" } });
    });
  }
  return NextResponse.json({ received: true });
}
