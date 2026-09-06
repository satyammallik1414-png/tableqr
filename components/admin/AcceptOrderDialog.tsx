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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface AcceptOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess: () => void;
}

export function AcceptOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: AcceptOrderDialogProps) {
  const [prepMinutes, setPrepMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);

  const quickMinutes = [10, 15, 20, 25, 30, 45];

  const handleAccept = async () => {
    if (!order) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/order/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACCEPTED",
          estimatedReadyMinutes: prepMinutes,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to accept order");
      }

      toast.success(`Order ${order.orderNumber || ""} accepted! Est. prep: ${prepMinutes} mins`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Accept order error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <ChefHat className="h-5 w-5 text-emerald-600" />
            Accept Order & Set Kitchen Time
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Accepting order{" "}
            <strong className="text-slate-800">{order?.orderNumber || "ticket"}</strong> will notify
            the customer with their estimated cooking wait time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick Minute Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Estimated Cooking Time (Minutes)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {quickMinutes.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setPrepMinutes(mins)}
                  className={`flex items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                    prepMinutes === mins
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{mins} mins</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Minute Input */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Or enter custom minutes:</Label>
            <Input
              type="number"
              min={1}
              max={180}
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(parseInt(e.target.value) || 15)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              disabled={loading || prepMinutes <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 px-4 h-9 shadow-sm cursor-pointer"
            >
              <ChefHat className="h-3.5 w-3.5" />
              {loading ? "Confirming..." : `Confirm & Accept (${prepMinutes} mins)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
