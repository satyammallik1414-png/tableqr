import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

async function findOrder(reference: string) {
  return prisma.order.findFirst({ where: { OR: [{ id: reference }, { orderNumber: reference }] }, include: { branch: { include: { restaurant: true } }, bills: { orderBy: { createdAt: "desc" }, take: 1 } } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await findOrder(orderId);
  if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  if (order.status !== "ACCEPTED" || !["PENDING", "FAILED", "CANCELLED"].includes(order.paymentStatus)) {
    return NextResponse.json({ success: false, error: "This order is not awaiting payment" }, { status: 409 });
  }
  let gatewayOrderId = order.gatewayOrderId;
  if (!gatewayOrderId) {
    const receipt = `order_${order.id}`.slice(0, 40);
    const gateway = await getPaymentProvider(order.paymentProvider || "razorpay").createOrder({ amountPaise: Math.round(order.total * 100), receipt, notes: { smartserveOrderId: order.id, orderNumber: order.orderNumber || order.id } });
    gatewayOrderId = gateway.id;
    await prisma.order.update({ where: { id: order.id }, data: { gatewayOrderId, paymentReceipt: receipt, paymentStatus: "PENDING", paymentInitiatedAt: new Date(), paymentFailureReason: null } });
  }
  return NextResponse.json({ success: true, data: { keyId: process.env.RAZORPAY_KEY_ID, gatewayOrderId, amount: Math.round(order.total * 100), currency: "INR", orderNumber: order.orderNumber, restaurantName: order.branch.restaurant.name, customerName: order.customerName, customerPhone: order.customerPhone } });
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const paymentId = String(body.gatewayPaymentId || "");
    const gatewayOrderId = String(body.gatewayOrderId || "");
    const signature = String(body.signature || "");
    const order = await findOrder(orderId);
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    if (order.paymentStatus === "PAID") return NextResponse.json({ success: true, data: { status: "PAID", orderStatus: order.status } });
    if (order.status !== "ACCEPTED") return NextResponse.json({ success: false, error: "Order is not awaiting payment" }, { status: 409 });
    if (!paymentId || !gatewayOrderId || !signature || gatewayOrderId !== order.gatewayOrderId) return NextResponse.json({ success: false, error: "Invalid payment verification data" }, { status: 400 });
    const provider = getPaymentProvider(order.paymentProvider || "razorpay");
    if (!provider.verifySignature({ orderId: gatewayOrderId, paymentId, signature })) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED", paymentFailureReason: "Signature verification failed" } });
      return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
    }
    const payment = await provider.fetchPayment(paymentId);
    const amountPaise = Math.round(order.total * 100);
    if (payment.orderId !== gatewayOrderId || payment.amount !== amountPaise || payment.status !== "captured") {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: payment.status === "failed" ? "FAILED" : "PROCESSING", paymentFailureReason: payment.status === "failed" ? "Gateway reported failure" : null } });
      return NextResponse.json({ success: false, pending: payment.status !== "failed", error: payment.status === "failed" ? "Payment was not completed" : "Payment pending confirmation" }, { status: 409 });
    }
    const now = new Date();
    const readyAt = new Date(now.getTime() + (order.estimatedReadyMinutes || 15) * 60000);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({ where: { id: order.id, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID", gatewayPaymentId: paymentId, paidAt: now, status: "PREPARING", estimatedReadyAt: readyAt, lastUpdatedAt: now, paymentFailureReason: null } });
      if (!updated.count) return;
      await tx.bill.updateMany({ where: { orderId: order.id }, data: { paymentStatus: "PAID", paymentMethod: "RAZORPAY", paidAt: now } });
      if (order.bills[0]) await tx.payment.create({ data: { billId: order.bills[0].id, restaurantId: order.branch.restaurantId, method: "RAZORPAY", amount: order.total, reference: paymentId, status: "PAID" } });
      await tx.orderItem.updateMany({ where: { orderId: order.id }, data: { status: "PREPARING" } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "PREPARING", note: "Payment verified. Order moved to preparation.", changedBy: "Razorpay verification" } });
    });
    return NextResponse.json({ success: true, data: { status: "PAID", orderStatus: "PREPARING", estimatedReadyAt: readyAt } });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ success: false, error: "Unable to verify payment" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await findOrder(orderId);
  if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  if (order.status === "ACCEPTED" && order.paymentStatus !== "PAID") await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "CANCELLED", paymentFailureReason: "Customer closed checkout" } });
  return NextResponse.json({ success: true });
}
