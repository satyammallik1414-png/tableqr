"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  GitBranch,
  Users,
  UserCircle,
  ShoppingBag,
  CreditCard,
  ArrowLeft,
  Power,
  Shield,
  Edit3,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BusinessDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editLimits, setEditLimits] = useState(false);
  const [limitData, setLimitData] = useState({
    maxBranches: "",
    maxStaff: "",
    maxCustomers: "",
    maxOrders: "",
  });

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/super-admin/businesses/${id}`);
      const json = await res.json();
      if (json.success) {
        setBusiness(json.data);
        setLimitData({
          maxBranches: json.data.maxBranches?.toString() || "",
          maxStaff: json.data.maxStaff?.toString() || "",
          maxCustomers: json.data.maxCustomers?.toString() || "",
          maxOrders: json.data.maxOrders?.toString() || "",
        });
      } else {
        toast.error(json.error || "Failed to load business details");
      }
    } catch {
      toast.error("Error loading business details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleUpdateLimits = async () => {
    try {
      const res = await fetch(`/api/super-admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxBranches: limitData.maxBranches ? parseInt(limitData.maxBranches, 10) : null,
          maxStaff: limitData.maxStaff ? parseInt(limitData.maxStaff, 10) : null,
          maxCustomers: limitData.maxCustomers ? parseInt(limitData.maxCustomers, 10) : null,
          maxOrders: limitData.maxOrders ? parseInt(limitData.maxOrders, 10) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Limits updated successfully");
        setEditLimits(false);
        fetchDetails();
      } else {
        toast.error(json.error || "Failed to update limits");
      }
    } catch {
      toast.error("Network error updating limits");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-8 text-center">
        <h3 className="font-bold text-lg">Business Not Found</h3>
        <Link href="/super-admin/businesses">
          <Button variant="link" className="mt-2">Back to Businesses</Button>
        </Link>
      </div>
    );
  }

  const activeSub = business.subscriptions?.[0];

  return (
    <div className="space-y-6">
      {/* Back & Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/super-admin/businesses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white font-bold text-lg shadow-xs">
            {business.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">{business.name}</h2>
              <Badge variant={business.status === "ACTIVE" ? "success" : "destructive"}>
                {business.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              ID: {business.id} • Slug: /{business.slug} • Joined {new Date(business.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Branches</CardTitle>
            <GitBranch className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{business._count.branches}</div>
            <p className="text-xs text-gray-500 mt-1">Limit: {business.maxBranches ?? activeSub?.plan?.maxBranches ?? "Unlimited"}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Staff & Users</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{business._count.users}</div>
            <p className="text-xs text-gray-500 mt-1">Limit: {business.maxStaff ?? activeSub?.plan?.maxStaff ?? "Unlimited"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{business.totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">Limit: {business.maxOrders ?? activeSub?.plan?.maxOrders ?? "Unlimited"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(business.totalRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">Cumulative sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border border-gray-200 dark:bg-gray-950 dark:border-gray-800 p-1 rounded-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="branches">Branches ({business.branches.length})</TabsTrigger>
          <TabsTrigger value="staff">Staff Users ({business.users.length})</TabsTrigger>
          <TabsTrigger value="limits">Plan & Limits</TabsTrigger>
          <TabsTrigger value="billing">Invoices & Billing</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <span className="text-gray-500">Owner Name:</span>
                  <span className="font-semibold">{business.ownerName || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <span className="text-gray-500">Owner Email:</span>
                  <span className="font-semibold">{business.ownerEmail || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <span className="text-gray-500">Owner Phone:</span>
                  <span className="font-semibold">{business.ownerPhone || "N/A"}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-gray-500">Primary Address:</span>
                  <span className="font-semibold">{business.address || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Current Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {activeSub ? (
                  <>
                    <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                      <span className="text-gray-500">Plan Name:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{activeSub.plan?.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                      <span className="text-gray-500">Status:</span>
                      <Badge variant="success">{activeSub.status}</Badge>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                      <span className="text-gray-500">Billing Cycle:</span>
                      <span className="font-semibold">{activeSub.billingCycle}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-500">Expiry Date:</span>
                      <span className="font-semibold">{new Date(activeSub.endDate).toLocaleDateString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 py-4 text-center">No active subscription plan attached.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Branches */}
        <TabsContent value="branches">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Branch Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {business.branches.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.address || "No address specified"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Manager: {b.manager?.name || "Unassigned"}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{b._count?.tables || 0} Tables • {b._count?.orders || 0} Orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Staff */}
        <TabsContent value="staff">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Business Users & Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {business.users.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {u.role}
                      </Badge>
                      <span className="text-xs text-gray-400">{u.branch?.name || "All Branches"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Limits Override */}
        <TabsContent value="limits">
          <Card className="shadow-sm max-w-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Custom Plan Limits Override</CardTitle>
              {!editLimits && (
                <Button variant="outline" size="sm" onClick={() => setEditLimits(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Limits
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Override plan limits for this specific business. Leave blank to inherit from active plan.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Max Branches</Label>
                  <Input
                    disabled={!editLimits}
                    type="number"
                    value={limitData.maxBranches}
                    onChange={(e) => setLimitData({ ...limitData, maxBranches: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Staff Users</Label>
                  <Input
                    disabled={!editLimits}
                    type="number"
                    value={limitData.maxStaff}
                    onChange={(e) => setLimitData({ ...limitData, maxStaff: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Customers</Label>
                  <Input
                    disabled={!editLimits}
                    type="number"
                    value={limitData.maxCustomers}
                    onChange={(e) => setLimitData({ ...limitData, maxCustomers: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max Orders</Label>
                  <Input
                    disabled={!editLimits}
                    type="number"
                    value={limitData.maxOrders}
                    onChange={(e) => setLimitData({ ...limitData, maxOrders: e.target.value })}
                  />
                </div>
              </div>
              {editLimits && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditLimits(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleUpdateLimits} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                    Save Overrides
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Billing */}
        <TabsContent value="billing">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Invoices & Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              {business.invoices.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No invoices generated for this business yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {business.invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">#{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={inv.status === "PAID" ? "success" : "secondary"}>
                          {inv.status}
                        </Badge>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
