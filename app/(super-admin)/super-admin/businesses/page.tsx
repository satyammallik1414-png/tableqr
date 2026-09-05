"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Power,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    address: "",
    status: "ACTIVE",
    planId: "",
  });

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        status: statusFilter === "ALL" ? "" : statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/super-admin/businesses?${query}`);
      const json = await res.json();
      if (json.success) {
        setBusinesses(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      toast.error("Failed to fetch businesses");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/plans");
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch {
      // ignore silently
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.ownerName || !formData.ownerEmail) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch("/api/super-admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Business created successfully!");
        setIsCreateOpen(false);
        setFormData({
          name: "",
          slug: "",
          ownerName: "",
          ownerEmail: "",
          ownerPhone: "",
          address: "",
          status: "ACTIVE",
          planId: "",
        });
        fetchBusinesses();
      } else {
        toast.error(json.error || "Failed to create business");
      }
    } catch {
      toast.error("Network error creating business");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (business: BusinessItem) => {
    const newStatus = business.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/super-admin/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Business ${newStatus.toLowerCase()} successfully`);
        fetchBusinesses();
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update business status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete business "${name}"? This action is irreversible.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/businesses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Business deleted");
        fetchBusinesses();
      } else {
        toast.error(json.error || "Failed to delete business");
      }
    } catch {
      toast.error("Network error deleting business");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Business Directory</h2>
          <p className="text-sm text-gray-500">Manage all registered restaurant & cafe accounts across the platform.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Add Business
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by business name, slug, owner..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Businesses Table */}
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
                  <th className="px-6 py-4">Business Name</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Plan / Status</th>
                  <th className="px-6 py-4">Branches</th>
                  <th className="px-6 py-4">Staff</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {businesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No businesses found matching criteria.
                    </td>
                  </tr>
                ) : (
                  businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white font-bold text-xs shadow-xs">
                            {b.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/super-admin/businesses/${b.id}`} className="font-semibold text-gray-900 hover:text-gray-600 dark:text-white dark:hover:text-gray-300">
                              {b.name}
                            </Link>
                            <p className="text-xs text-gray-400">/{b.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{b.ownerName || "N/A"}</p>
                        <p className="text-xs text-gray-500">{b.ownerEmail || "No email"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant={b.status === "ACTIVE" ? "success" : b.status === "SUSPENDED" ? "destructive" : "secondary"}>
                            {b.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {b.currentSubscription?.plan?.name || "No Active Plan"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                        {b._count?.branches || 0}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                        {b._count?.users || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/super-admin/businesses/${b.id}`}>
                            <Button variant="ghost" size="sm" title="View Details">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(b)}
                            title={b.status === "ACTIVE" ? "Suspend Business" : "Activate Business"}
                          >
                            <Power className={`h-4 w-4 ${b.status === "ACTIVE" ? "text-amber-600" : "text-emerald-600"}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(b.id, b.name)}
                            title="Delete Business"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
              Showing page {page} of {totalPages} ({total} items)
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

      {/* Create Business Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Business Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Business Name *</Label>
              <Input
                required
                placeholder="Royal Spice Bistro"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setFormData({ ...formData, name, slug });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Business Slug *</Label>
              <Input
                required
                placeholder="royal-spice-bistro"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Owner Name *</Label>
                <Input
                  required
                  placeholder="John Doe"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Owner Email *</Label>
                <Input
                  required
                  type="email"
                  placeholder="owner@example.com"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Owner Phone</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Initial Plan</Label>
                <Select value={formData.planId} onValueChange={(val) => setFormData({ ...formData, planId: val })}>
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
            </div>
            <div className="space-y-1">
              <Label>Primary Address</Label>
              <Input
                placeholder="City Center, MG Road"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                {createLoading ? "Creating..." : "Create Business"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
