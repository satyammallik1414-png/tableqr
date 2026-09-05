"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  DollarSign,
  ClipboardList,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { TableGrid } from "@/components/counter/TableGrid";
import { BillGenerator } from "@/components/counter/BillGenerator";
import { useSocket } from "@/hooks/useSocket";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse, Table, Order } from "@/types";

async function fetchTables(branchId: string) {
  const res = await fetch(`/api/tables?branchId=${branchId}`);
  const data: ApiResponse<Table[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function fetchOrders(branchId: string) {
  const res = await fetch(`/api/orders?branchId=${branchId}`);
  const data: ApiResponse<Order[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function CounterPage() {
  const { data: session } = useSession();
  const branchId = session?.user?.branchId ?? "";
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const { data: tables } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: () => fetchTables(branchId),
    enabled: !!branchId,
    refetchInterval: 10000,
  });

  const { data: orders } = useQuery({
    queryKey: ["orders", branchId],
    queryFn: () => fetchOrders(branchId),
    enabled: !!branchId,
    refetchInterval: 10000,
  });

  useSocket({ branchId, role: "CASHIER", enabled: !!branchId });

  const activeTables = tables?.filter((t) => t.status === "OCCUPIED" || t.status === "RESERVED") ?? [];
  const todayOrders = orders?.filter((o) => {
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }) ?? [];
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
  const tablesTurned = tables?.filter((t) => t.status !== "AVAILABLE").length ?? 0;

  const selectedOrder = selectedTable
    ? orders?.find((o) => o.tableId === selectedTable && o.status !== "SERVED" && o.status !== "CANCELLED")
    : null;

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-white lg:h-[100dvh] lg:flex-row">
      {/* Left Panel - Table Grid */}
      <div className="flex w-[400px] flex-col border-r border-gray-200">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-2 border-b border-gray-200 p-4">
          {[
            {
              label: "Revenue Today",
              value: formatCurrency(todayRevenue),
              icon: DollarSign,
              color: "text-success-600",
            },
            {
              label: "Orders",
              value: todayOrders.length,
              icon: ClipboardList,
              color: "text-gray-600",
            },
            {
              label: "Avg Order",
              value: formatCurrency(avgOrderValue),
              icon: TrendingUp,
              color: "text-sky-600",
            },
            {
              label: "Tables Turned",
              value: tablesTurned,
              icon: RotateCcw,
              color: "text-blue-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="mt-1 font-heading text-lg font-bold">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-3 font-heading font-semibold">Floor Plan</h2>
          <TableGrid
            tables={tables ?? []}
            selected={selectedTable}
            onSelect={setSelectedTable}
          />
        </div>
      </div>

      {/* Right Panel - Order Details / Billing */}
      <div className="flex-1 overflow-y-auto">
        {selectedOrder && selectedTable ? (
          <BillGenerator
            order={selectedOrder}
            tableNumber={
              tables?.find((t) => t.id === selectedTable)?.tableNumber ?? 0
            }
            onBillGenerated={() => setSelectedTable(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <ClipboardList className="h-8 w-8" />
              </div>
              <p className="font-heading text-lg font-semibold">
                Select a Table
              </p>
              <p className="mt-1 text-sm">
                Choose an occupied table to view order and generate bill
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
