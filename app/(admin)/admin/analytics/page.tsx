"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, AnalyticsData } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

async function fetchAnalytics(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/analytics/summary?${searchParams}`);
  const data: ApiResponse<AnalyticsData> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("daily");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => fetchAnalytics({ period }),
  });

  return (
    <FeatureGuard featureKey="ANALYTICS">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500">
            Detailed insights and performance metrics
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Revenue",
            value: analytics?.revenueToday ?? 0,
            icon: DollarSign,
            prefix: true,
            color: "text-gray-600",
            bg: "bg-gray-100",
          },
          {
            label: "Orders",
            value: analytics?.ordersToday ?? 0,
            icon: ShoppingBag,
            prefix: false,
            color: "text-gray-600",
            bg: "bg-gray-100",
          },
          {
            label: "Avg Order Value",
            value: analytics?.averageOrderValue ?? 0,
            icon: TrendingUp,
            prefix: true,
            color: "text-gray-600",
            bg: "bg-gray-100",
          },
          {
            label: "Avg Prep Time",
            value: analytics?.averagePrepTime ?? 0,
            icon: Clock,
            prefix: false,
            color: "text-gray-600",
            bg: "bg-gray-100",
            suffix: " min",
          },
        ].map((kpi, i) => (
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
                  {("suffix" in kpi) ? (kpi as { suffix?: string }).suffix ?? "" : ""}
                </p>
                <p className="text-sm text-gray-500">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AnalyticsChart
                data={analytics?.revenueTrend ?? []}
                type="line"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AnalyticsChart
                data={analytics?.orderVolume ?? []}
                type="bar"
                dataKey="count"
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
            {isLoading ? (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AnalyticsChart
                data={(analytics?.categoryPerformance ?? []).map((c) => ({
                  name: c.name,
                  count: c.revenue,
                }))}
                type="pie"
                dataKey="count"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <AnalyticsChart
                data={(analytics?.peakHours ?? []).map((h) => ({
                  name: `${h.hour}:00`,
                  count: h.count,
                }))}
                type="area"
                dataKey="count"
                xKey="name"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <>
                <div className="flex justify-between rounded-2xl bg-white p-4">
                  <span className="text-sm text-gray-500">New Customers Today</span>
                  <span className="font-heading font-bold">
                    {analytics?.newCustomers ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white p-4">
                  <span className="text-sm text-gray-500">Active Tables</span>
                  <span className="font-heading font-bold">
                    {analytics?.activeTables ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white p-4">
                  <span className="text-sm text-gray-500">Tables Turned</span>
                  <span className="font-heading font-bold">
                    {analytics?.tablesTurned ?? 0}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </FeatureGuard>
  );
}
