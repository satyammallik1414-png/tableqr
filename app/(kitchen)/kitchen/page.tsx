"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { ChefHat, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderTicket } from "@/components/kitchen/OrderTicket";
import { KitchenStats } from "@/components/kitchen/KitchenStats";
import { useOrderStore } from "@/store/orderStore";
import { ORDER_STATUS_FLOW } from "@/lib/constants";
import type { Order } from "@/types";

const KITCHEN_COLUMNS = [
  { id: "RECEIVED", label: "New Orders", color: "border-l-blue-500", icon: Clock },
  { id: "PREPARING", label: "Preparing", color: "border-l-yellow-500", icon: TrendingUp },
  { id: "READY", label: "Ready to Serve", color: "border-l-green-500", icon: ChefHat },
  { id: "SERVED", label: "Completed", color: "border-l-gray-400", icon: ChefHat },
];

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export default function KitchenPage() {
  const { data: session } = useSession();
  const { activeOrders: orders, setOrders, updateOrderStatus, stats } = useOrderStore();
  const { socket: socketIo, emit: socketEmit } = useSocket({ branchId: session?.user?.branchId || "" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders?branchId=${session?.user?.branchId || ""}`);
        const data = await res.json();
        if (data.success) setOrders(data.data);
      } catch (e) {
        console.error("Failed to fetch orders:", e);
      }
    };
    fetchOrders();
  }, [session, setOrders]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socketIo) return;
    socketIo.on("order-status-updated", () => {
      const refetch = async () => {
        try {
          const res = await fetch(`/api/orders?branchId=${session?.user?.branchId || ""}`);
          const data = await res.json();
          if (data.success) setOrders(data.data);
        } catch (e) {
          console.error("Failed to refetch orders:", e);
        }
      };
      refetch();
    });
    return () => {
      socketIo.off("order-status-updated");
    };
  }, [socketIo, session, setOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        updateOrderStatus(orderId, newStatus as Order["status"]);
        socketEmit("order-updated", { orderId, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Please sign in to access the kitchen display.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-gray-600" />
              <h1 className="font-heading text-2xl font-bold">Kitchen Display</h1>
            </div>
            <Badge variant="outline" className="text-sm">
              {session?.user?.branchName}
            </Badge>
          </div>
          <div className="flex items-center gap-6">
            <KitchenStats stats={stats} />
            <div className="font-heading text-2xl font-bold tabular-nums text-gray-900">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-3 lg:gap-6 lg:p-6">
        {KITCHEN_COLUMNS.map((column) => {
          const columnOrders = orders.filter(
            (o) =>
              o.status === column.id &&
              o.status !== "CANCELLED",
          );

          return (
            <div
              key={column.id}
              className={`min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4 ${column.color} border-l-4`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <column.icon className="h-5 w-5 text-gray-600" />
                  <h2 className="font-heading text-lg font-semibold">
                    {column.label}
                  </h2>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700">
                  {columnOrders.length}
                </div>
              </div>

              <div className="space-y-3">
                {columnOrders.map((order) => (
                  <OrderTicket
                    key={order.id}
                    order={order}
                    onStatusChange={(status) => handleStatusUpdate(order.id, status)}
                    nextStatus={
                      ORDER_STATUS_FLOW[order.status]?.[0] as Order["status"] | undefined
                    }
                  />
                ))}
                {columnOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="rounded-full bg-gray-100 p-3">
                      <ChefHat className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-medium">No orders</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
