"use client";

import { useState } from "react";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  CheckCircle2,
  ChefHat,
  BellRing,
  Utensils,
  XCircle,
  Clock,
  AlertTriangle,
  Phone,
  User,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime, getTimeSince } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/constants";
import type { OrderStatus } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";
import { AcceptOrderDialog } from "@/components/admin/AcceptOrderDialog";
import { CancelOrderDialog } from "@/components/admin/CancelOrderDialog";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { data: orders, isLoading, refetch, isFetching } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();

  // Dialog states
  const [acceptingOrder, setAcceptingOrder] = useState<any>(null);
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);

  const filtered =
    orders?.filter((o: any) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        (o.orderNumber && o.orderNumber.toLowerCase().includes(searchLower)) ||
        o.id.toLowerCase().includes(searchLower) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchLower)) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(searchLower)) ||
        (o.table?.tableNumber && `table ${o.table.tableNumber}`.includes(searchLower));

      const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) ?? [];

  const counts: Record<string, number> = {
    ALL: orders?.length ?? 0,
    PENDING: orders?.filter((o) => o.status === "PENDING").length ?? 0,
    RECEIVED: orders?.filter((o) => o.status === "RECEIVED").length ?? 0,
    PREPARING: orders?.filter((o) => o.status === "PREPARING").length ?? 0,
    READY: orders?.filter((o) => o.status === "READY").length ?? 0,
    SERVED: orders?.filter((o) => o.status === "SERVED").length ?? 0,
    COMPLETED: orders?.filter((o) => o.status === "COMPLETED").length ?? 0,
    CANCELLED: orders?.filter((o) => o.status === "CANCELLED").length ?? 0,
  };

  const handleQuickStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        orderId,
        status: nextStatus,
      });
      toast.success(`Order moved to ${nextStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  return (
    <FeatureGuard featureKey="ORDERS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-navy-900">Live Orders</h1>
            <p className="text-sm text-gray-500">
              Real-time multi-restaurant QR & in-house ticket management
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 text-xs border-slate-300 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Orders
          </Button>
        </div>

        {/* Status Filter Cards */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {Object.entries(counts).map(([key, count]) => {
            const isPendingTab = key === "PENDING" && count > 0;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-left transition-all ${
                  statusFilter === key
                    ? "border-navy-900 bg-navy-900 text-white shadow-xs"
                    : isPendingTab
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-heading text-lg font-bold">{count}</p>
                  {isPendingTab && statusFilter !== key && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <p
                  className={`text-[11px] font-medium uppercase tracking-wider ${
                    statusFilter === key
                      ? "text-blue-200"
                      : isPendingTab
                      ? "text-amber-700 font-bold"
                      : "text-gray-400"
                  }`}
                >
                  {key === "ALL" ? "Total" : key}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by order number (ORD-...), customer, phone, or table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Orders Listing */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order: any) => {
              const now = Date.now();
              const submittedTime = new Date(order.submittedAt || order.createdAt).getTime();
              const elapsedMinutes = Math.floor((now - submittedTime) / 60000);
              const isOverduePending = order.status === "PENDING" && elapsedMinutes >= 10;
              const isWarningPending = order.status === "PENDING" && elapsedMinutes >= 5;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className={`border transition-all ${
                      isOverduePending
                        ? "border-red-300 bg-red-50/40 ring-1 ring-red-400"
                        : isWarningPending
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Left: Table & Core Meta */}
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl font-heading font-bold shadow-xs ${
                              order.table?.tableNumber
                                ? "bg-navy-900 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {order.table?.tableNumber ? (
                              <>
                                <span className="text-[10px] font-normal tracking-wider opacity-80 uppercase">
                                  Table
                                </span>
                                <span className="text-base leading-none">
                                  {order.table.tableNumber}
                                </span>
                              </>
                            ) : (
                              <QrCode className="h-5 w-5" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-navy-900 text-sm">
                                {order.orderNumber || `ORD-${order.id.slice(-6).toUpperCase()}`}
                              </span>

                              <Badge className={`text-xs px-2 py-0.5 ${ORDER_STATUS_COLORS[order.status]}`}>
                                {order.status}
                              </Badge>

                              {/* Overdue Warnings for Pending */}
                              {isOverduePending && (
                                <Badge className="bg-red-600 text-white text-[10px] gap-1 animate-pulse">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue ({elapsedMinutes}m)
                                </Badge>
                              )}
                              {!isOverduePending && isWarningPending && (
                                <Badge className="bg-amber-500 text-white text-[10px] gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pending {elapsedMinutes}m
                                </Badge>
                              )}
                            </div>

                            {/* Customer & Time info */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              {order.customerName && (
                                <span className="flex items-center gap-1 font-medium text-slate-800">
                                  <User className="h-3 w-3 text-slate-400" />
                                  {order.customerName}
                                  {order.customerPhone && (
                                    <span className="text-slate-500 font-normal">
                                      ({order.customerPhone})
                                    </span>
                                  )}
                                </span>
                              )}

                              <span>
                                {formatDateTime(order.submittedAt || order.createdAt)} (
                                {getTimeSince(order.submittedAt || order.createdAt)})
                              </span>

                              {order.estimatedReadyMinutes && order.status === "PREPARING" && (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <ChefHat className="h-3 w-3" />
                                  Est. {order.estimatedReadyMinutes}m prep
                                </span>
                              )}
                            </div>

                            {/* Order items pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {Array.isArray(order.items) &&
                                order.items.map((item: any, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                  >
                                    <strong className="mr-1 text-navy-900">{item.quantity}×</strong>
                                    {item.name}
                                  </span>
                                ))}
                            </div>

                            {/* Special instructions */}
                            {order.notes && (
                              <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-0.5 mt-1 border border-amber-200 inline-block">
                                <strong>Note:</strong> {order.notes}
                              </p>
                            )}

                            {/* Cancellation reason if cancelled */}
                            {order.cancellationReason && (
                              <p className="text-xs text-red-700 bg-red-50 rounded px-2 py-0.5 mt-1 border border-red-200 inline-block">
                                <strong>Cancelled:</strong> {order.cancellationReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Price & Quick Action Buttons */}
                        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                          <div className="text-left lg:text-right">
                            <p className="font-heading font-bold text-navy-900 text-base">
                              {formatCurrency(order.total)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {order.items?.length || 0} items
                            </p>
                          </div>

                          {/* Action Buttons: strictly Accept and Cancel */}
                          <div className="flex items-center gap-2">
                            {(order.status === "PENDING" || order.status === "RECEIVED") && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setAcceptingOrder(order)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCancellingOrder(order)}
                                  className="text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold text-xs h-8 px-3.5 rounded-xl gap-1.5 cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                              </>
                            )}

                            {(order.status === "PREPARING" || order.status === "READY") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCancellingOrder(order)}
                                className="text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold text-xs h-8 px-3.5 rounded-xl gap-1.5 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                <Utensils className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No orders found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {statusFilter !== "ALL"
                    ? `No orders currently in ${statusFilter} status.`
                    : "No orders have been submitted yet."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Accept Order Dialog */}
        {acceptingOrder && (
          <AcceptOrderDialog
            open={!!acceptingOrder}
            onOpenChange={(open) => !open && setAcceptingOrder(null)}
            order={acceptingOrder}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["orders"] });
            }}
          />
        )}

        {/* Cancel Order Dialog */}
        {cancellingOrder && (
          <CancelOrderDialog
            open={!!cancellingOrder}
            onOpenChange={(open) => !open && setCancellingOrder(null)}
            order={cancellingOrder}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["orders"] });
            }}
          />
        )}
      </div>
    </FeatureGuard>
  );
}
