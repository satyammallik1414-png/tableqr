import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentStock } = body;

    const item = await prisma.inventory.update({
      where: { id },
      data: { currentStock: parseFloat(currentStock) },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Update inventory error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update inventory" },
      { status: 500 },
    );
  }
}
