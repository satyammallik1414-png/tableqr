import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/features";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("ANALYTICS", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersToday, allOrders, tables, customers, revenueTrend, topItems] = await Promise.all([
      prisma.order.findMany({
        where: { ...where, createdAt: { gte: today } },
      }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.table.findMany({ where: branchId ? { branchId } : {} }),
      prisma.customer.findMany({
        where: {
          ...(branchId ? { restaurant: { branches: { some: { id: branchId } } } } : {}),
          createdAt: { gte: today },
        },
      }),
      prisma.order.findMany({
        where: { ...where, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: "asc" },
        select: { total: true, createdAt: true },
      }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { items: true },
      }),
    ]);

    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    for (const order of topItems) {
      const items = order.items as Array<{ name: string; price: number; quantity: number }>;
      for (const item of items) {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { count: 0, revenue: 0 };
        }
        itemCounts[item.name].count += item.quantity;
        itemCounts[item.name].revenue += item.price * item.quantity;
      }
    }

    const sortedItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    const revenueTrendMap: Record<string, number> = {};
    for (const order of revenueTrend) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      revenueTrendMap[dateKey] = (revenueTrendMap[dateKey] ?? 0) + order.total;
    }

    const activeTables = tables.filter((t) => t.status === "OCCUPIED").length;
    const revenueToday = ordersToday.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = ordersToday.length > 0 ? revenueToday / ordersToday.length : 0;

    const prepTimes = allOrders
      .filter((o) => o.status === "SERVED")
      .map((o) => (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 60000)
      .filter((t) => t > 0);
    const avgPrepTime = prepTimes.length > 0
      ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        revenueToday,
        ordersToday: ordersToday.length,
        activeTables,
        newCustomers: customers.length,
        revenueTrend: Object.entries(revenueTrendMap).map(([date, amount]) => ({
          date,
          amount,
        })),
        orderVolume: [],
        topItems: sortedItems,
        peakHours: [],
        categoryPerformance: [],
        averageOrderValue: avgOrderValue,
        tablesTurned: tables.filter((t) => t.status !== "AVAILABLE").length,
        averagePrepTime: avgPrepTime,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
