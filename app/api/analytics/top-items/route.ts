import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;

    const orders = await prisma.order.findMany({
      where: {
        ...where,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { items: true },
    });

    const itemCounts: Record<string, number> = {};
    for (const order of orders) {
      const items = order.items as Array<{ name: string; quantity: number }>;
      for (const item of items) {
        itemCounts[item.name] = (itemCounts[item.name] ?? 0) + item.quantity;
      }
    }

    const sorted = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({ success: true, data: sorted });
  } catch (error) {
    console.error("Top items error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch top items" },
      { status: 500 },
    );
  }
}
