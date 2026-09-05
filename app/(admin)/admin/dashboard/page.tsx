"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  DollarSign,
  ClipboardList,
  Table2,
  UserPlus,
  TrendingUp,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { ApiResponse, AnalyticsData, Order } from "@/types";

const AnalyticsChart = dynamic(
  () => import("@/components/admin/AnalyticsChart").then((m) => m.AnalyticsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full rounded-2xl bg-gray-50 dark:bg-gray-800/40 animate-pulse flex items-center justify-center text-xs text-gray-400">
        Loading analytics visualization...
      </div>
    ),
  }
);

async function fetchAnalytics(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/analytics/summary?${searchParams}`);
  const data: ApiResponse<AnalyticsData> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function fetchRecentOrders() {
  const res = await fetch("/api/orders?limit=10");
  const data: ApiResponse<Order[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const branchId = session?.user?.branchId;

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["analytics", branchId],
    queryFn: () => fetchAnalytics(branchId ? { branchId } : undefined),
    refetchInterval: 30000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders", branchId],
    queryFn: fetchRecentOrders,
    refetchInterval: 15000,
  });

  const kpiCards = [
    {
      label: "Revenue Today",
      value: analytics?.revenueToday ?? 0,
      icon: DollarSign,
      color: "text-gray-600",
      bg: "bg-gray-100",
      prefix: true,
    },
    {
      label: "Orders Today",
      value: analytics?.ordersToday ?? 0,
      icon: ClipboardList,
      color: "text-gray-600",
      bg: "bg-gray-100",
      prefix: false,
    },
    {
      label: "Active Tables",
      value: analytics?.activeTables ?? 0,
      icon: Table2,
      color: "text-gray-600",
      bg: "bg-gray-100",
      prefix: false,
    },
    {
      label: "New Customers",
      value: analytics?.newCustomers ?? 0,
      icon: UserPlus,
      color: "text-gray-600",
      bg: "bg-gray-100",
      prefix: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {session?.user?.branchName ?? "All Branches"}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-2.5 ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
                <p className="mt-3 font-heading text-2xl font-bold">
                  {kpi.prefix ? formatCurrency(kpi.value) : kpi.value}
                </p>
                <p className="text-sm text-gray-500">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Revenue Trend
              <div className="flex gap-1">
                {["Daily", "Weekly", "Monthly"].map((p) => (
                  <Button key={p} variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    {p}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AnalyticsChart
                data={analytics?.revenueTrend ?? []}
                type="area"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AnalyticsChart
                data={(analytics?.topItems ?? []).map((item) => ({
                  name: item.name,
                  count: item.count,
                }))}
                type="bar"
                dataKey="count"
                xKey="name"
                height={300}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders?.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                    #{order.tableId?.slice(-3) ?? "N/A"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      Order #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.items.length} items &middot;{" "}
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <Badge
                    variant={
                      order.status === "RECEIVED"
                        ? "default"
                        : order.status === "PREPARING"
                          ? "secondary"
                          : order.status === "READY"
                            ? "success"
                            : "outline"
                    }
                  >
                    {order.status}
                  </Badge>
                  <span className="font-semibold">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            ))}
            {(!recentOrders || recentOrders.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-500">
                No recent orders
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
