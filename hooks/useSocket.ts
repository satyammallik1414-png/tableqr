"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useOrderStore } from "@/store/orderStore";
import { useNotificationStore } from "@/store/notificationStore";

interface UseSocketOptions {
  branchId?: string | null;
  tableId?: string | null;
  role?: string | null;
  enabled?: boolean;
}

export function useSocket({
  branchId,
  tableId,
  role,
  enabled = true,
}: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const addOrder = useOrderStore((s) => s.addOrder);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!enabled) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const socket = io(socketUrl, {
      path: "/api/socket",
      query: {
        branchId: branchId || "",
        tableId: tableId || "",
        role: role || "",
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("order:new", (data) => {
      if (data.order) {
        addOrder(data.order);
      }
    });

    socket.on("order:status", (data) => {
      if (data.orderId && data.status) {
        updateOrderStatus(data.orderId, data.status);
      }
    });

    socket.on("notification:new", (data) => {
      addNotification(data);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [branchId, tableId, role, enabled, addOrder, updateOrderStatus, addNotification]);

  const emit = useCallback(
    (event: string, data: Record<string, unknown>) => {
      socketRef.current?.emit(event, data);
    },
    [],
  );

  return { socket: socketRef.current, emit };
}
