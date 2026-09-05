"use client";

import { useEffect, useState, useCallback } from "react";
import { FileCheck, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BusinessItem, SubscriptionPlanItem } from "@/types/super-admin";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [formData, setFormData] = useState({
    restaurantId: "",
    planId: "",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
  });

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        status: statusFilter === "ALL" ? "" : statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/super-admin/subscriptions?${query}`);
      const json = await res.json();
      if (json.success) {
        setSubscriptions(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      toast.error("Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/businesses?limit=100");
      const json = await res.json();
      if (json.success) setBusinesses(json.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/plans");
      const json = await res.json();
      if (json.success) setPlans(json.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.restaurantId || !formData.planId) {
      toast.error("Please select a business and plan");
      return;
    }

    try {
      setAssignLoading(true);
      const res = await fetch("/api/super-admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Subscription assigned successfully!");
        setIsAssignOpen(false);
        setFormData({ restaurantId: "", planId: "", status: "ACTIVE", billingCycle: "MONTHLY" });
        fetchSubscriptions();
      } else {
        toast.error(json.error || "Failed to assign subscription");
      }
    } catch {
      toast.error("Network error assigning subscription");
    } finally {
      setAssignLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Subscription Management</h2>
          <p className="text-sm text-gray-500">Monitor subscription states (Trial, Active, Past Due, Expired) and assign plans.</p>
        </div>
        <Button onClick={() => setIsAssignOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Assign Subscription
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase">Subscription Status:</span>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAST_DUE">Past Due</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs overflow-hidden dark:border-gray-800 dark:bg-gray-950">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4">Business</th>
                  <th className="px-6 py-4">Plan Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Billing Cycle</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">End / Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No subscription records found.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/50">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {s.restaurant?.name}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {s.plan?.name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            s.status === "ACTIVE"
                              ? "success"
                              : s.status === "TRIAL"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-mono">{s.billingCycle}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(s.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {new Date(s.endDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages} ({total} items)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Subscription to Business</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Business *</Label>
              <Select
                value={formData.restaurantId}
                onValueChange={(val) => setFormData({ ...formData, restaurantId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plan *</Label>
              <Select
                value={formData.planId}
                onValueChange={(val) => setFormData({ ...formData, planId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (₹{p.monthlyPrice}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAST_DUE">Past Due</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Billing Cycle</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(val) => setFormData({ ...formData, billingCycle: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignLoading} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                {assignLoading ? "Assigning..." : "Assign Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
