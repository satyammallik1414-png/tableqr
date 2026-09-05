"use client";

import { useEffect, useState, useCallback } from "react";
import { UserCircle, Search, ChevronLeft, ChevronRight, Award } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BusinessItem } from "@/types/super-admin";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        restaurantId: businessFilter === "ALL" ? "" : businessFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/super-admin/customers?${query}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      toast.error("Failed to fetch customer directory");
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
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Customer CRM Directory</h2>
        <p className="text-sm text-gray-500">View customer activity, loyalty points, and spending across all restaurants.</p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search customer name, phone, email..."
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

      {/* Customers Table */}
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
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Business</th>
                  <th className="px-6 py-4">Loyalty Tier</th>
                  <th className="px-6 py-4">Total Visits</th>
                  <th className="px-6 py-4">Total Spend</th>
                  <th className="px-6 py-4">Loyalty Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/50">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        <p>{c.name || "Guest Customer"}</p>
                        <p className="text-xs text-gray-400 font-normal">{c.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{c.restaurant?.name}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 px-2 py-1 rounded-md w-fit">
                          <Award className="h-3.5 w-3.5" /> {c.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">{c.totalVisits}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {formatCurrency(c.totalSpend)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{c.loyaltyPoints} pts</td>
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
              Page {page} of {totalPages} ({total} customers)
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
    </div>
  );
}
