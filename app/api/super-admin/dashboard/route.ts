import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalBranches,
      totalUsers,
      totalCustomers,
      ordersTodayCount,
      paymentsToday,
      activeSubscriptionsCount,
      expiredSubscriptionsCount,
      recentRegistrations,
      recentPayments,
      allActiveSubs,
      topBusinessesData,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { status: "ACTIVE" } }),
      prisma.restaurant.count({ where: { status: "SUSPENDED" } }),
      prisma.branch.count(),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: todayStart },
          status: "PAID",
        },
        _sum: { amount: true },
      }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "EXPIRED" } }),
      prisma.restaurant.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          ownerName: true,
          ownerEmail: true,
          createdAt: true,
          status: true,
        },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: { select: { name: true } },
          bill: { select: { order: { select: { branch: { select: { restaurant: { select: { name: true } } } } } } } },
        },
      }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: true },
      }),
      prisma.restaurant.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          _count: { select: { branches: true, users: true } },
          branches: {
            select: {
              orders: {
                select: { total: true },
              },
            },
          },
        },
      }),
    ]);

    // Calculate MRR
    let mrr = 0;
    allActiveSubs.forEach((sub) => {
      if (sub.billingCycle === "MONTHLY") {
        mrr += sub.plan.monthlyPrice;
      } else if (sub.billingCycle === "YEARLY") {
        mrr += sub.plan.yearlyPrice / 12;
      }
    });

    const revenueToday = paymentsToday._sum.amount ?? 0;

    // Monthly business growth & revenue trend (last 7 days)
    const revenueTrend: Array<{ date: string; amount: number }> = [];
    const businessGrowthTrend: Array<{ date: string; count: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const [dayPaymentSum, dayBizCount] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: "PAID",
          },
          _sum: { amount: true },
        }),
        prisma.restaurant.count({
          where: { createdAt: { lte: endOfDay } },
        }),
      ]);

      revenueTrend.push({ date: dateStr, amount: dayPaymentSum._sum.amount ?? 0 });
      businessGrowthTrend.push({ date: dateStr, count: dayBizCount });
    }

    // Process top businesses by revenue
    const topBusinessesByRevenue = topBusinessesData
      .map((b) => {
        let totalRevenue = 0;
        let totalOrders = 0;
        b.branches.forEach((br) => {
          totalOrders += br.orders.length;
          br.orders.forEach((o) => {
            totalRevenue += o.total;
          });
        });
        return {
          id: b.id,
          name: b.name,
          revenue: Math.round(totalRevenue),
          ordersCount: totalOrders,
          branchesCount: b._count.branches,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const formattedRecentPayments = recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      status: p.status,
      createdAt: p.createdAt,
      businessName: p.restaurant?.name ?? p.bill?.order?.branch?.restaurant?.name ?? "N/A",
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalBusinesses,
        activeBusinesses,
        suspendedBusinesses,
        totalBranches,
        totalUsers,
        totalCustomers,
        ordersToday: ordersTodayCount,
        revenueToday,
        mrr: Math.round(mrr),
        activeSubscriptions: activeSubscriptionsCount,
        expiredSubscriptions: expiredSubscriptionsCount,
        recentRegistrations,
        recentPayments: formattedRecentPayments,
        revenueTrend,
        businessGrowthTrend,
        topBusinessesByRevenue,
      },
    });
  } catch (error) {
    console.error("Super Admin Dashboard Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Super Admin dashboard metrics." },
      { status: 500 }
    );
  }
}
