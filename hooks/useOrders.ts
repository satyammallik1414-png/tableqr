"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrderStore } from "@/store/orderStore";
import type { ApiResponse, Order, OrderStatus } from "@/types";

async function fetchOrders(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`/api/orders?${searchParams}`);
  const data: ApiResponse<Order[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export function useOrders(params?: Record<string, string>) {
  const setOrders = useOrderStore((s) => s.setOrders);

  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => fetchOrders(params),
    refetchInterval: 15000,
    select: (data) => {
      setOrders(data);
      return data;
    },
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  const addOrder = useOrderStore((s) => s.addOrder);

  return useMutation({
    mutationFn: async (orderData: Record<string, unknown>) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const data: ApiResponse<Order> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data!;
    },
    onSuccess: (order) => {
      addOrder(order);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: ApiResponse<Order> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data!;
    },
    onSuccess: (order) => {
      updateOrderStatus(order.id, order.status);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
