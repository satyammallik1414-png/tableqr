"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GitBranch,
  Building2,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  UserCheck,
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
import type { BusinessItem } from "@/types/super-admin";

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    restaurantId: "",
    name: "",
    address: "",
    phone: "",
  });

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        restaurantId: businessFilter === "ALL" ? "" : businessFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/super-admin/branches?${query}`);
      const json = await res.json();
      if (json.success) {
        setBranches(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      toast.error("Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  }, [search, businessFilter, page]);

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/businesses?limit=100");
      const json = await res.json();
      if (json.success) {
        setBusinesses(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.restaurantId || !formData.name) {
      toast.error("Please select a business and enter branch name");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch("/api/super-admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Branch created successfully!");
        setIsCreateOpen(false);
        setFormData({ restaurantId: "", name: "", address: "", phone: "" });
        fetchBranches();
      } else {
        toast.error(json.error || "Failed to create branch");
      }
    } catch {
      toast.error("Network error creating branch");
    } finally {
      setCreateLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Branch Management</h2>
          <p className="text-sm text-gray-500">View and manage all branch locations across all businesses.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Create Branch
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search branch name, address, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Business:</span>
            <Select
              value={businessFilter}
              onValueChange={(val) => {
                setBusinessFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Businesses</SelectItem>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Branches Table */}
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
                  <th className="px-6 py-4">Branch Name</th>
                  <th className="px-6 py-4">Business</th>
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Tables</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">Staff Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No branches found.
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/50">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-gray-500" />
                          <span>{b.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-normal">{b.address || "No address"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-medium">
                          {b.restaurant?.name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {b.manager ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded-md w-fit">
                            <UserCheck className="h-3 w-3" /> {b.manager.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold">{b._count?.tables || 0}</td>
                      <td className="px-6 py-4 font-semibold">{b._count?.orders || 0}</td>
                      <td className="px-6 py-4 font-semibold">{b._count?.users || 0}</td>
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
              Page {page} of {totalPages} ({total} branches)
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

      {/* Create Branch Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Branch Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Target Business *</Label>
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
              <Label>Branch Name *</Label>
              <Input
                required
                placeholder="Downtown Express"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                placeholder="123 Park Avenue"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Contact Phone</Label>
              <Input
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                {createLoading ? "Creating..." : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
