"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Building2,
  GitBranch,
  Users,
  UserCircle,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Receipt,
  Star,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import type { SuperAdminDashboardMetrics } from "@/types/super-admin";

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

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<SuperAdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load metrics");
      }
    } catch {
      setError("Network error loading dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-10 w-96 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-3 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
          Access Denied / Authentication Required
        </h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md">
          {error}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Button
            onClick={() => signOut({ callbackUrl: "/login?callbackUrl=/super-admin" })}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs"
          >
            Sign in as Super Admin
          </Button>
          <Button onClick={fetchMetrics} variant="outline" className="rounded-xl">
            Retry
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-white">Super Admin Credentials:</span>{" "}
          Email: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-700">superadmin@smartserve.ai</code> | Password: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-700">SuperAdmin@123!</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Hero Section matching homepage aesthetic */}
      <section className="pt-2 pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-600 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              <Star className="h-3.5 w-3.5 text-gray-900 dark:text-white" />
              <span>Platform Control & Network Operations</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              AI-Powered Restaurant Network
            </h1>

            <p className="text-base text-gray-500 dark:text-gray-400">
              Global operations dashboard for managing restaurants, multi-branch operations, staff, customers, and subscription plans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/super-admin/businesses">
              <Button size="lg" className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                <Plus className="mr-2 h-4 w-4" /> Add Restaurant
              </Button>
            </Link>
            <Link href="/super-admin/plans">
              <Button size="lg" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 font-medium">
                Pricing Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Top 4 Hero Stats matching homepage (500+, 50++, 2+M+, 4.9+) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 pt-2">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {data.totalBusinesses}+
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1.5">
            Active Businesses
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <span className="text-emerald-600 font-semibold">{data.activeBusinesses} live</span>
            <span>•</span>
            <span>{data.suspendedBusinesses} suspended</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {data.totalBranches}++
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1.5">
            Branch Locations
          </p>
          <p className="text-xs text-gray-400 mt-2">Across multiple cities</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {formatCurrency(data.mrr)}
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1.5">
            Monthly Recurring Revenue
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-2">{data.activeSubscriptions} active subscriptions</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {data.ordersToday}+
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1.5">
            Orders Served Today
          </p>
          <p className="text-xs text-gray-400 mt-2">Today&apos;s revenue: {formatCurrency(data.revenueToday)}</p>
        </div>
      </div>

      {/* Operational KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Staff & Staff Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalUsers}</div>
            <p className="text-xs text-gray-400 mt-1">Managers, Kitchen & Cashiers</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Registered Customers
            </CardTitle>
            <UserCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalCustomers}</div>
            <p className="text-xs text-gray-400 mt-1">Loyalty CRM database</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Subscriptions
            </CardTitle>
            <CreditCard className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.activeSubscriptions}</div>
            <p className="text-xs text-amber-600 font-medium mt-1">{data.expiredSubscriptions} expired</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today&apos;s Paid Volume
            </CardTitle>
            <Receipt className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(data.revenueToday)}
            </div>
            <p className="text-xs text-gray-400 mt-1">Verified settlement total</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 pb-4">
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-between">
              <span>Platform Revenue Trend</span>
              <span className="text-xs font-normal text-gray-500">Last 7 Days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <AnalyticsChart
              data={data.revenueTrend.map((r) => ({ name: r.date, amount: r.amount }))}
              type="area"
              height={260}
              dataKey="amount"
              xKey="name"
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 pb-4">
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-between">
              <span>Business Registration Growth</span>
              <span className="text-xs font-normal text-gray-500">Cumulative Count</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <AnalyticsChart
              data={data.businessGrowthTrend.map((b) => ({ name: b.date, count: b.count }))}
              type="bar"
              height={260}
              dataKey="count"
              xKey="name"
            />
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Top Businesses & Recent Registrations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Businesses by Revenue */}
        <Card className="lg:col-span-2 rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                Top Businesses by Revenue
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Highest grossing partner restaurants</p>
            </div>
            <Link
              href="/super-admin/businesses"
              className="text-xs font-semibold text-gray-900 hover:text-gray-600 dark:text-white dark:hover:text-gray-300 flex items-center gap-1"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {data.topBusinessesByRevenue.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No business revenue data yet.</p>
              ) : (
                data.topBusinessesByRevenue.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white font-bold text-xs shadow-xs">
                        {b.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{b.name}</p>
                        <p className="text-xs text-gray-500">
                          {b.branchesCount} Branches • {b.ordersCount} Orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {formatCurrency(b.revenue)}
                      </p>
                      <p className="text-[11px] text-gray-400">Total Volume</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 pb-4">
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
              Recent Registrations
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">New business onboarding</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {data.recentRegistrations.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No recent registrations.</p>
              ) : (
                data.recentRegistrations.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800"
                  >
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.ownerName || b.ownerEmail || "N/A"}</p>
                    </div>
                    <Badge variant={b.status === "ACTIVE" ? "success" : "secondary"}>
                      {b.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
