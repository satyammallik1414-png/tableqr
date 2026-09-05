import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { billSchema } from "@/lib/validations";
import { generateBillNumber } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = billSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { orderId, discount, serviceCharge, paymentMethod, splitCount, notes } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 },
      );
    }

    const subtotal = order.subtotal;
    const taxRate = 0.05;
    const taxAmount = subtotal * taxRate;

    const total = subtotal + taxAmount + serviceCharge - discount;

    const bill = await prisma.bill.create({
      data: {
        orderId,
        billNumber: generateBillNumber(),
        subtotal,
        taxAmount,
        serviceCharge,
        discount,
        total,
        paymentMethod,
        paymentStatus: "PENDING",
        splitCount,
        notes,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "SERVED" },
    });

    if (order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE", currentOrderId: null },
      });
    }

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (error) {
    console.error("Generate bill error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate bill" },
      { status: 500 },
    );
  }
}
