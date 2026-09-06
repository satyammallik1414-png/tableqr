"use client";

import { useEffect, useRef, useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  CheckCircle2,
  ChefHat,
  BellRing,
  Utensils,
  XCircle,
  Clock,
  AlertTriangle,
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
import { FeatureGuard } from "@/components/shared/FeatureGuard";
import { AcceptOrderDialog } from "@/components/admin/AcceptOrderDialog";
import { CancelOrderDialog } from "@/components/admin/CancelOrderDialog";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const autoCompletionRequested = useRef(new Set<string>());
  const { data: orders, isLoading, refetch, isFetching } = useOrders();
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

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const expired = orders?.find((order: any) => {
      if (!["PREPARING", "RECEIVED", "READY"].includes(order.status)) return false;
      const readyAt = order.estimatedReadyAt
        ? new Date(order.estimatedReadyAt).getTime()
        : order.acceptedAt && order.estimatedReadyMinutes
        ? new Date(order.acceptedAt).getTime() + order.estimatedReadyMinutes * 60000
        : null;
      return readyAt !== null && readyAt <= clockNow && !autoCompletionRequested.current.has(order.id);
    });
    if (expired) {
      autoCompletionRequested.current.add(expired.id);
      refetch();
    }
  }, [clockNow, orders, refetch]);

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
              const now = clockNow;
              const submittedTime = new Date(order.submittedAt || order.createdAt).getTime();
              const elapsedMinutes = Math.floor((now - submittedTime) / 60000);
              const isOverduePending = order.status === "PENDING" && elapsedMinutes >= 10;
              const isWarningPending = order.status === "PENDING" && elapsedMinutes >= 5;

              const readyTimestamp = order.estimatedReadyAt
                ? new Date(order.estimatedReadyAt).getTime()
                : order.acceptedAt && order.estimatedReadyMinutes
                ? new Date(order.acceptedAt).getTime() + order.estimatedReadyMinutes * 60000
                : null;
              const isPrepCompleted = readyTimestamp !== null && now >= readyTimestamp;
              const isOrderReady = order.status === "READY" || (order.status === "PREPARING" && isPrepCompleted);
              const remainingSeconds = readyTimestamp ? Math.max(0, Math.ceil((readyTimestamp - now) / 1000)) : 0;
              const countdown = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className={`border transition-all ${
                      isOrderReady
                        ? "border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-300"
                        : isOverduePending
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

                              {isOrderReady ? (
                                <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 gap-1 shadow-xs">
                                  <BellRing className="h-3 w-3 animate-bounce" />
                                  READY
                                </Badge>
                              ) : (
                                <Badge className={`text-xs px-2 py-0.5 ${ORDER_STATUS_COLORS[order.status]}`}>
                                  {order.status}
                                </Badge>
                              )}

                              <Badge className={`text-[10px] px-2 py-0.5 ${order.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : order.paymentStatus === "NOT_REQUIRED" ? "bg-slate-100 text-slate-700" : order.paymentStatus === "FAILED" || order.paymentStatus === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                                Payment: {String(order.paymentStatus || "NOT_REQUIRED").replace("_", " ")}
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

                              {order.status === "PREPARING" && (
                                <span
                                  className={
                                    isPrepCompleted
                                      ? "text-emerald-700 font-bold flex items-center gap-1"
                                      : "text-blue-700 font-semibold flex items-center gap-1"
                                  }
                                >
                                  {isPrepCompleted ? (
                                    <BellRing className="h-3 w-3 text-emerald-600 animate-bounce" />
                                  ) : (
                                    <ChefHat className="h-3 w-3 text-blue-600" />
                                  )}
                                  {isPrepCompleted
                                    ? "Cooking time finished • Ready!"
                                    : `Est. ${order.estimatedReadyMinutes || 15}m prep`}
                                </span>
                              )}

                              {order.status === "READY" && (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <BellRing className="h-3 w-3 text-emerald-600" />
                                  Order is Ready!
                                </span>
                              )}
                            </div>

                            {/* Order items pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {Array.isArray(order.items) &&
                                order.items.map((item: any, i: number) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                      isOrderReady
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold"
                                        : "border-slate-200 bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <strong className="mr-1 text-navy-900">{item.quantity}×</strong>
                                    {item.name}
                                    {isOrderReady && (
                                      <span className="ml-1.5 inline-block text-[9px] font-bold uppercase text-emerald-700 bg-white/90 px-1 rounded border border-emerald-300">
                                        Ready
                                      </span>
                                    )}
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

                        {/* Right: Pricing & Actions */}
                        <div className="flex flex-row items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:flex-col lg:items-end lg:justify-center lg:border-t-0 lg:pt-0">
                          <div className="text-left lg:text-right">
                            <span className="text-xs text-slate-400">Total</span>
                            <p className="font-heading text-lg font-bold text-navy-900">
                              {formatCurrency(order.total)}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {order.orderItems?.length || order.items?.length || 0} item(s)
                            </span>
                          </div>

                          {/* Action Buttons */}
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
                              <div className="flex min-w-[112px] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-900" role="timer" aria-live="polite">
                                <Clock className="h-4 w-4" />
                                <span className="font-mono text-lg font-extrabold tabular-nums">{countdown}</span>
                              </div>
                            )}
                            {order.status === "ACCEPTED" && (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                Waiting for customer payment
                              </div>
                            )}
                            {order.status === "COMPLETED" && (
                              <div className="flex min-w-[112px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800" role="status">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm font-extrabold">Completed</span>
                              </div>
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
