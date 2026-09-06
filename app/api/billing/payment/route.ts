import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Payment system is temporarily unavailable." },
    { status: 410 },
  );
}

async function legacyPaymentPOST(request: Request) {
  try {
    const body = await request.json();
    const { billId, method, amount, reference } = body;

    const payment = await prisma.payment.create({
      data: {
        billId,
        method,
        amount: parseFloat(amount),
        reference,
        status: "PAID",
      },
    });

    await prisma.bill.update({
      where: { id: billId },
      data: { paymentStatus: "PAID", paidAt: new Date() },
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record payment" },
      { status: 500 },
    );
  }
}
