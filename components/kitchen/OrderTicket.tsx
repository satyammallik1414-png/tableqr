"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTimeSince, getTimeSinceColor, formatCurrency } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

interface OrderTicketProps {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
  nextStatus?: OrderStatus;
}

export function OrderTicket({
  order,
  onStatusChange,
  nextStatus,
}: OrderTicketProps) {
  const [timeSince, setTimeSince] = useState(getTimeSince(order.createdAt));

  useEffect(() => {
    setTimeSince(getTimeSince(order.createdAt));
    const interval = setInterval(() => {
      setTimeSince(getTimeSince(order.createdAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const getNextButtonLabel = () => {
    switch (nextStatus) {
      case "PREPARING":
        return "Accept";
      case "READY":
        return "Mark Ready";
      case "SERVED":
        return "Served";
      default:
        return "Next";
    }
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border border-gray-200 bg-white p-4 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-2xl font-bold text-gray-900">
              Table #{order.tableId?.slice(-3) ?? "N/A"}
            </span>
            {order.priority && (
              <Flag className="h-5 w-5 text-danger-500" />
            )}
          </div>
          <p className="text-xs text-gray-500">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${getTimeSinceColor(order.createdAt)}`} />
          <span
            className={`text-sm font-medium tabular-nums ${getTimeSinceColor(order.createdAt)}`}
          >
            {timeSince}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="mt-3 space-y-1.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">
                {item.quantity}x
              </span>
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                {item.notes && (
                  <p className="text-xs text-gray-500 italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>
            </div>
            {item.variants && item.variants.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {item.variants[0].name}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {nextStatus && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onStatusChange(nextStatus)}
          >
            {getNextButtonLabel()}
          </Button>
        )}
        {order.status !== "CANCELLED" && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => onStatusChange("CANCELLED")}
          >
            Cancel
          </Button>
        )}
      </div>
    </motion.div>
  );
}
