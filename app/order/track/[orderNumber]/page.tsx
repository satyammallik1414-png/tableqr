"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/constants";
import {
  RefreshCw,
  PhoneCall,
  Clock,
  Utensils,
  MapPin,
  ReceiptText,
  AlertCircle,
  Home,
  ArrowLeft,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface OrderTrackingPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const router = useRouter();
  const { orderNumber } = use(params);

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Customer cancellation states
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Ordered by mistake");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        router.back();
      } else if (document.referrer) {
        window.location.href = document.referrer;
      } else {
        router.push("/");
      }
    }
  }, [router]);

  const fetchStatus = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch(`/api/order/${orderNumber}/status`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Order not found");
      }
      setOrderData(json.data);
      setError(null);
      if (showRefreshing) {
        toast.success("Order status refreshed!");
      }
    } catch (err: unknown) {
      console.error("Error fetching order status:", err);
      setError(err instanceof Error ? err.message : "Failed to load order status");
      if (showRefreshing) {
        toast.error("Failed to refresh order status");
      }
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, [orderNumber]);

  const handleCancelOrder = useCallback(async () => {
    const finalReason = cancelReason === "Other reason" ? customReason.trim() : cancelReason;
    if (!finalReason) {
      toast.error("Please select or enter a cancellation reason");
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`/api/order/${orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to cancel order");
      }

      toast.success("Order has been cancelled");
      setCancelDialogOpen(false);
      await fetchStatus(false);
    } catch (err: unknown) {
      console.error("Cancel order error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  }, [cancelReason, customReason, orderNumber, fetchStatus]);

  useEffect(() => {
    fetchStatus();
    // Poll every 10 seconds for real-time status updates
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-center">
        <div className="space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-navy-900 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">Checking order status...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Card className="max-w-md border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
            <h2 className="text-lg font-bold text-navy-900">Order Not Found</h2>
            <p className="text-sm text-slate-600 mt-1">
              {error || "We couldn't locate an order with this ticket number."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => fetchStatus(true)} className="bg-navy-900 text-white cursor-pointer">
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
              <Button variant="outline" onClick={handleGoBack} className="cursor-pointer border-slate-300">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  const readyTimestamp = orderData?.estimatedReadyAt
    ? new Date(orderData.estimatedReadyAt).getTime()
    : orderData?.acceptedAt && orderData?.estimatedReadyMinutes
    ? new Date(orderData.acceptedAt).getTime() + orderData.estimatedReadyMinutes * 60000
    : null;

  const isTimeCompleted = readyTimestamp !== null && now >= readyTimestamp;

  let displayStatus = orderData?.status || "PENDING";
  let displayBadgeClass = ORDER_STATUS_COLORS[orderData?.status] || "bg-slate-100 text-slate-800";

  const isCancellable =
    orderData?.status === "PENDING" ||
    orderData?.status === "RECEIVED" ||
    orderData?.status === "PREPARING";

  if (orderData?.status === "PENDING") {
    displayStatus = "PENDING";
    displayBadgeClass = "bg-amber-100 text-amber-800 border border-amber-300";
  } else if (orderData?.status === "PREPARING" || orderData?.status === "RECEIVED") {
    if (isTimeCompleted) {
      displayStatus = "YOUR ORDER IS READY";
      displayBadgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold";
    } else {
      displayStatus = "PREPARING";
      displayBadgeClass = "bg-blue-100 text-blue-800 border border-blue-300 font-bold";
    }
  } else if (orderData?.status === "READY" || orderData?.status === "SERVED" || orderData?.status === "COMPLETED") {
    displayStatus = "YOUR ORDER IS READY";
    displayBadgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold";
  } else if (orderData?.status === "CANCELLED") {
    displayStatus = "CANCELLED";
    displayBadgeClass = "bg-red-100 text-red-800 border border-red-300";
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-navy-900">{orderData.restaurant?.name || "SmartServe"}</h1>
              <p className="text-xs text-slate-500">{orderData.branch?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCancellable && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel Order
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="gap-1.5 text-xs text-slate-700 border-slate-300 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-5">
        {/* Order Ticket Card */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Order Number
                </span>
                <h2 className="text-xl font-extrabold text-navy-900">{orderData.orderNumber}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed at{" "}
                  {new Date(orderData.submittedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <Badge className={`text-xs px-3 py-1 font-bold ${displayBadgeClass}`}>
                {displayStatus}
              </Badge>
            </div>
          </CardHeader>

          {orderData.status === "PENDING" && (
            <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold">Waiting for restaurant confirmation</span>
                  <p className="text-[11px] text-amber-700">Need to cancel or make changes? You can cancel before cooking begins.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold shrink-0 cursor-pointer h-7 px-3 rounded-lg"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Cancel Order
              </Button>
            </div>
          )}

          {orderData.status === "CANCELLED" && (
            <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                Order Cancelled
              </div>
              <p className="text-red-700">
                {orderData.cancellationReason
                  ? `Reason: ${orderData.cancellationReason}`
                  : "This order has been cancelled."}
              </p>
              {orderData.cancelledAt && (
                <p className="text-[11px] text-red-500">
                  Cancelled at {new Date(orderData.cancelledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          )}

          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
              <div>
                <span className="text-slate-400">Guest: </span>
                <span className="font-semibold text-slate-800">{orderData.customerName || "Customer"}</span>
                {orderData.customerPhone && (
                  <span className="text-slate-500"> ({orderData.customerPhone})</span>
                )}
              </div>

              <div>
                <span className="text-slate-400">Type: </span>
                <span className="font-semibold text-slate-800">
                  {orderData.table ? `Table ${orderData.table.tableNumber}` : orderData.orderType}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="pt-2">
              <OrderTimeline
                status={orderData.status}
                submittedAt={orderData.submittedAt}
                acceptedAt={orderData.acceptedAt}
                estimatedReadyMinutes={orderData.estimatedReadyMinutes}
                estimatedReadyAt={orderData.estimatedReadyAt}
                cancelledAt={orderData.cancelledAt}
                cancellationReason={orderData.cancellationReason}
                restaurantPhone={orderData.restaurant?.phone || orderData.branch?.phone}
                restaurantName={orderData.restaurant?.name}
                isPendingTimeout={orderData.isPendingTimeout}
                elapsedMinutes={orderData.elapsedMinutes}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ordered Items Summary */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-slate-500" />
              Order Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-3 space-y-3">
            <div className="space-y-2.5">
              {Array.isArray(orderData.items) &&
                orderData.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800">
                        {item.quantity} × {item.name}
                      </div>
                      {item.variants && item.variants.length > 0 && (
                        <div className="text-[11px] text-slate-500">
                          {item.variants.map((v: any) => v.name).join(", ")}
                        </div>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[11px] text-slate-500">
                          + {item.addons.map((a: any) => a.name).join(", ")}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[11px] italic text-slate-400">Note: {item.notes}</div>
                      )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(orderData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Fees (5%)</span>
                <span>{formatCurrency(orderData.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-navy-900 border-t pt-2">
                <span>Total Paid / Due</span>
                <span>{formatCurrency(orderData.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Contact Card */}
        {(orderData.restaurant?.phone || orderData.branch?.phone) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Need Help with your Order?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Contact {orderData.restaurant?.name || "Restaurant Staff"}
              </p>
            </div>
            <a href={`tel:${orderData.restaurant?.phone || orderData.branch?.phone}`}>
              <Button size="sm" variant="outline" className="gap-2 border-navy-900 text-navy-900 text-xs">
                <PhoneCall className="h-3.5 w-3.5" /> Call Restaurant
              </Button>
            </a>
          </div>
        )}

        {/* Customer Cancel Order Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-600">
                <XCircle className="h-5 w-5 text-red-600" />
                Cancel Order
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Are you sure you want to cancel order <strong className="text-slate-700">{orderData.orderNumber}</strong>?
                Please choose a reason:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Ordered by mistake",
                  "Need to change items / table",
                  "Wait time too long",
                  "Changed my mind",
                  "Other reason",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`text-left text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${
                      cancelReason === reason
                        ? "border-red-500 bg-red-50 text-red-800 font-semibold ring-1 ring-red-400"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {cancelReason === "Other reason" && (
                <Input
                  placeholder="Please describe why you are cancelling..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="text-xs h-9"
                />
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(false)}
                disabled={cancelling}
                className="text-xs cursor-pointer"
              >
                Keep Order
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCancelOrder}
                disabled={cancelling || (!cancelReason || (cancelReason === "Other reason" && !customReason.trim()))}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
              >
                <XCircle className="h-3.5 w-3.5" />
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
