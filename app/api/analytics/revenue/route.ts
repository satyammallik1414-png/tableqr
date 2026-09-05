import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const period = searchParams.get("period") ?? "daily";

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;

    const days = period === "monthly" ? 365 : period === "weekly" ? 90 : 30;

    const orders = await prisma.order.findMany({
      where: {
        ...where,
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "asc" },
      select: { total: true, createdAt: true },
    });

    const revenueMap: Record<string, number> = {};
    for (const order of orders) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      revenueMap[dateKey] = (revenueMap[dateKey] ?? 0) + order.total;
    }

    return NextResponse.json({
      success: true,
      data: Object.entries(revenueMap).map(([date, amount]) => ({
        date,
        amount,
      })),
    });
  } catch (error) {
    console.error("Revenue analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch revenue data" },
      { status: 500 },
    );
  }
}
