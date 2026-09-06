import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Payment system is temporarily unavailable." },
    { status: 410 },
  );
}

async function legacyPaymentPOST(
  request: Request,
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

    const body = await request.json().catch(() => ({}));
    const method = (body.method || "UPI").toUpperCase();
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        branch: {
          select: {
            restaurantId: true,
          },
        },
        bills: {
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

    const now = new Date();
    let bill = order.bills[0];

    // If bill does not exist, create one
    if (!bill) {
      const billNumber = `BILL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      bill = await prisma.bill.create({
        data: {
          orderId: order.id,
          billNumber,
          subtotal: order.subtotal,
          taxAmount: order.tax,
          serviceCharge: order.serviceCharge,
          total: order.total,
          paymentMethod: "CASH",
          paymentStatus: "PENDING",
        },
      });
    }

    let nextPaymentStatus: PaymentStatus = bill.paymentStatus;
    let nextPaymentMethod: PaymentMethod = bill.paymentMethod;
    let historyNote = "";

    if (method === "UPI") {
      nextPaymentStatus = "PAID";
      nextPaymentMethod = "UPI";
      historyNote = reference
        ? `Customer completed payment via UPI (Ref: ${reference})`
        : "Customer completed payment via UPI QR code";
    } else if (method === "CASH") {
      nextPaymentMethod = "CASH";
      historyNote = "Customer chose to pay cash at counter / to server";
    } else if (method === "CARD" || method === "CREDIT_CARD") {
      nextPaymentMethod = "CREDIT_CARD";
      historyNote = "Customer requested card POS machine at table/counter";
    }

    // Atomic update
    const result = await prisma.$transaction(async (tx) => {
      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          paymentStatus: nextPaymentStatus,
          paymentMethod: nextPaymentMethod,
          paidAt: nextPaymentStatus === "PAID" ? now : bill.paidAt,
          notes: reference
            ? `UPI Ref: ${reference}`
            : method === "CASH"
            ? "Pay cash at counter"
            : method === "CARD"
            ? "Card requested"
            : bill.notes,
        },
      });

      if (nextPaymentStatus === "PAID") {
        await tx.payment.create({
          data: {
            billId: bill.id,
            restaurantId: order.branch?.restaurantId,
            method: nextPaymentMethod,
            amount: bill.total || order.total,
            reference: reference || null,
            status: "PAID",
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: historyNote,
          changedBy: "Customer",
        },
      });

      return updatedBill;
    });

    return NextResponse.json({
      success: true,
      message:
        nextPaymentStatus === "PAID"
          ? "Payment received and verified successfully!"
          : "Payment request updated successfully!",
      data: {
        paymentStatus: result.paymentStatus,
        paymentMethod: result.paymentMethod,
        paidAt: result.paidAt,
        notes: result.notes,
      },
    });
  } catch (error) {
    console.error("Order payment processing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process payment for order" },
      { status: 500 }
    );
  }
}
