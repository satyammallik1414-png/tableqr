import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { billSchema } from "@/lib/validations";
import { generateBillNumber } from "@/lib/utils";
import { getPlatformFee } from "@/lib/platform-fee";

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

    const { orderId, discount, paymentMethod, splitCount, notes } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        branch: { select: { restaurantId: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 },
      );
    }

    const subtotal = order.subtotal;

    // Retrieve restaurant tax settings
    let taxRate = 0;
    const settingRecord = await prisma.platformSetting.findUnique({
      where: { key: `settings_${order.branch?.restaurantId}` },
    });
    const savedTax = (settingRecord?.value as any)?.tax;
    if (savedTax !== undefined) {
      const cgst = typeof savedTax?.cgst === "number" ? savedTax.cgst : (Number(savedTax?.cgst) || 0);
      const sgst = typeof savedTax?.sgst === "number" ? savedTax.sgst : (Number(savedTax?.sgst) || 0);
      taxRate = Math.max(0, (cgst + sgst) / 100);
    }
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const platformFee = await getPlatformFee(order.branch?.restaurantId);
    const total = Math.round((subtotal + taxAmount + platformFee - discount) * 100) / 100;

    const bill = await prisma.bill.create({
      data: {
        orderId,
        billNumber: generateBillNumber(),
        subtotal,
        taxAmount,
        serviceCharge: platformFee,
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
