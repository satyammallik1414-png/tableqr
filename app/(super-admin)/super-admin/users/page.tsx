"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
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
import type { BusinessItem } from "@/types/super-admin";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [businessFilter, setBusinessFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
    restaurantId: "",
    phone: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        role: roleFilter === "ALL" ? "" : roleFilter,
        restaurantId: businessFilter === "ALL" ? "" : businessFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/super-admin/users?${query}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, businessFilter, page]);

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
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error("Please fill in required user fields");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("User created successfully!");
        setIsCreateOpen(false);
        setFormData({ name: "", email: "", password: "", role: "ADMIN", restaurantId: "", phone: "" });
        fetchUsers();
      } else {
        toast.error(json.error || "Failed to create user");
      }
    } catch {
      toast.error("Network error creating user");
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
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">User & Role Management</h2>
          <p className="text-sm text-gray-500">Manage accounts across Super Admin, Business Admins, Managers, Kitchen, and Cashiers.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search user name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Business Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="KITCHEN">Kitchen Staff</SelectItem>
                <SelectItem value="CASHIER">Cashier</SelectItem>
                <SelectItem value="WAITER">Waiter</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={businessFilter}
              onValueChange={(val) => {
                setBusinessFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
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

      {/* Users Table */}
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
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Business</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/50">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        <p>{u.name}</p>
                        <p className="text-xs text-gray-400 font-normal">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            u.role === "SUPERADMIN"
                              ? "destructive"
                              : u.role === "ADMIN"
                              ? "default"
                              : "secondary"
                          }
                          className="font-mono text-xs"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {u.restaurant?.name || <span className="text-gray-400">Global Platform</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {u.branch?.name || <span className="text-gray-400">All Branches</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
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
              Page {page} of {totalPages} ({total} users)
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

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input
                required
                placeholder="Jane Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address *</Label>
              <Input
                required
                type="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input
                required
                type="password"
                placeholder="Enter initial password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role *</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                    <SelectItem value="ADMIN">Business Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen Staff</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="WAITER">Waiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Business</Label>
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
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                {createLoading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
