"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApiResponse, Customer } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

async function fetchCustomers() {
  const res = await fetch("/api/customers");
  const data: ApiResponse<Customer[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

const tierColors: Record<string, "default" | "secondary" | "success" | "outline"> = {
  PLATINUM: "default",
  GOLD: "success",
  SILVER: "secondary",
  BRONZE: "outline",
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const filtered = customers?.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  return (
    <FeatureGuard featureKey="CUSTOMERS">
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Customers</h1>
        <p className="text-sm text-gray-500">
          View customer details and loyalty information
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.name || "Anonymous"}
                    {customer.email && (
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    )}
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.totalVisits}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(customer.totalSpend)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tierColors[customer.tier] ?? "outline"
                      }
                    >
                      {customer.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.loyaltyPoints}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No customers found
            </p>
          )}
        </div>
      )}
    </div>
    </FeatureGuard>
  );
}
