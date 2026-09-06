"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess: () => void;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const quickReasons = [
    "Item out of stock",
    "Kitchen temporarily overloaded",
    "Customer requested cancellation",
    "Duplicate order detected",
    "Payment / verification issue",
  ];

  const readyTimestamp = order?.estimatedReadyAt
    ? new Date(order.estimatedReadyAt).getTime()
    : order?.acceptedAt && order?.estimatedReadyMinutes
    ? new Date(order.acceptedAt).getTime() + order.estimatedReadyMinutes * 60000
    : null;
  const isTimeCompleted = readyTimestamp !== null && Date.now() >= readyTimestamp;
  const isReadyOrCompleted = order?.status === "READY" || (order?.status === "PREPARING" && isTimeCompleted);

  const handleCancel = async () => {
    if (isReadyOrCompleted) {
      toast.error("Preparation time has completed and order is ready. Cancellation is disabled.");
      onOpenChange(false);
      return;
    }

    if (!order || !reason.trim()) {
      toast.error("Please specify a cancellation reason");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/order/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancellationReason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to cancel order");
      }

      toast.success(`Order ${order.orderNumber || ""} has been cancelled`);
      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (err: unknown) {
      console.error("Cancel order error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-600">
            <XCircle className="h-5 w-5 text-red-600" />
            Cancel Order
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Are you sure you want to cancel order{" "}
            <strong className="text-slate-800 font-semibold">{order?.orderNumber}</strong>?
          </DialogDescription>
        </DialogHeader>

        {isReadyOrCompleted ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
              <p className="font-bold text-amber-800">Cancellation Disabled</p>
              <p>
                The cooking time has finished and this order is already marked as ready. It cannot be cancelled.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Quick Reason Badges */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Quick Reasons</Label>
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition-colors text-left cursor-pointer ${
                      reason === r
                        ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Cancellation Reason (Required) *
              </Label>
              <Textarea
                rows={3}
                placeholder="Explain why this order is being cancelled..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs"
              >
                Keep Order
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={loading || !reason.trim()}
                className="text-xs font-bold gap-1.5 shadow-sm"
              >
                {loading ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
