import { create } from "zustand";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  isOpen: boolean;
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  get unreadCount(): number;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()(
  (set, get) => ({
    notifications: [],
    isOpen: false,

    setNotifications: (notifications) => set({ notifications }),

    addNotification: (notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
      }));
    },

    markRead: (id) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
      }));
    },

    markAllRead: () => {
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
        })),
      }));
    },

    clearAll: () => set({ notifications: [] }),

    removeNotification: (id) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },

    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

    setOpen: (open) => set({ isOpen: open }),

    get unreadCount() {
      return get().notifications.filter((n) => !n.isRead).length;
    },
  }),
);
