"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/notificationStore";
import type { ApiResponse, Notification } from "@/types";

async function fetchNotifications() {
  const res = await fetch("/api/notifications");
  const data: ApiResponse<Notification[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export function useNotifications() {
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
    select: (data) => {
      setNotifications(data);
      return data;
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: ApiResponse<Notification> = await res.json();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (notification) => {
      addNotification(notification);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
