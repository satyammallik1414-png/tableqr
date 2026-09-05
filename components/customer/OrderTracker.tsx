"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock, ChefHat, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useOrderStore } from "@/store/orderStore";
import { formatCurrency, getTimeSince } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/constants";
import type { Order, OrderStatus } from "@/types";

interface OrderTrackerProps {
  order: Order;
  onClose: () => void;
}

const statusSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
  { status: "RECEIVED", icon: <Clock className="h-5 w-5" />, label: "Received" },
  { status: "PREPARING", icon: <ChefHat className="h-5 w-5" />, label: "Preparing" },
  { status: "READY", icon: <Utensils className="h-5 w-5" />, label: "Ready" },
  { status: "SERVED", icon: <Check className="h-5 w-5" />, label: "Served" },
];

const statusOrder: OrderStatus[] = ["RECEIVED", "PREPARING", "READY", "SERVED", "CANCELLED"];

export function OrderTracker({ order, onClose }: OrderTrackerProps) {
  const [timeSinceOrder, setTimeSinceOrder] = useState("");
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);

  useEffect(() => {
    setTimeSinceOrder(getTimeSince(order.createdAt));
    const interval = setInterval(() => {
      setTimeSinceOrder(getTimeSince(order.createdAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const currentStepIndex = statusOrder.indexOf(order.status);
  const progressPercent = order.status === "CANCELLED"
    ? 0
    : ((currentStepIndex) / (statusSteps.length - 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-lg"
    >
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold">Order Status</h3>
          <p className="text-sm text-gray-500">
            Order #{order.id.slice(-6).toUpperCase()} &middot; {timeSinceOrder}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={ORDER_STATUS_COLORS[order.status]}>
            {order.status}
          </Badge>
          {order.status !== "SERVED" && order.status !== "CANCELLED" && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="mt-6">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="mt-4 flex justify-between">
          {statusSteps.map((step, i) => {
            const isActive = i <= currentStepIndex && order.status !== "CANCELLED";
            const isCancelled = order.status === "CANCELLED";
            return (
              <div key={step.status} className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${
                    isActive && !isCancelled
                      ? "bg-gray-900 text-white"
                      : isCancelled && i === 0
                        ? "bg-danger-500 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCancelled && i === 0 ? <X className="h-5 w-5" /> : step.icon}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive && !isCancelled
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium text-gray-500">Items</h4>
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <div>
                <p className="text-sm font-medium">
                  {item.quantity}x {item.name}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-500">{item.notes}</p>
                )}
              </div>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-heading text-xl font-bold">
          {formatCurrency(order.total)}
        </span>
      </div>

      {order.status === "SERVED" && (
        <Button className="mt-6 w-full" onClick={onClose}>
          Done
        </Button>
      )}
    </motion.div>
  );
}
