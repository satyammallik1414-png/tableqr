import { create } from "zustand";
import type { Order, OrderStatus } from "@/types";

interface OrderState {
  activeOrders: Order[];
  completedOrders: Order[];
  selectedOrder: Order | null;
  stats: {
    activeCount: number;
    preparingCount: number;
    readyCount: number;
    completedToday: number;
    averagePrepTime: number;
  };
}

interface OrderActions {
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  setSelectedOrder: (order: Order | null) => void;
  calculateStats: () => void;
  clearCompleted: () => void;
}

type OrderStore = OrderState & OrderActions;

const initialState: OrderState = {
  activeOrders: [],
  completedOrders: [],
  selectedOrder: null,
  stats: {
    activeCount: 0,
    preparingCount: 0,
    readyCount: 0,
    completedToday: 0,
    averagePrepTime: 0,
  },
};

export const useOrderStore = create<OrderStore>()((set, get) => ({
  ...initialState,

  setOrders: (orders) => {
    const active = orders.filter(
      (o) => o.status !== "SERVED" && o.status !== "CANCELLED",
    );
    const completed = orders.filter(
      (o) => o.status === "SERVED" || o.status === "CANCELLED",
    );
    set({ activeOrders: active, completedOrders: completed });
    get().calculateStats();
  },

  addOrder: (order) => {
    set((state) => ({
      activeOrders: [order, ...state.activeOrders],
    }));
    get().calculateStats();
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => {
      const updateInList = (orders: Order[]) =>
        orders.map((o) => (o.id === orderId ? { ...o, status } : o));

      const activeOrders = updateInList(state.activeOrders);
      const completedOrders = updateInList(state.completedOrders);

      const updatedOrder = [...activeOrders, ...completedOrders].find(
        (o) => o.id === orderId,
      );

      return {
        activeOrders:
          status === "SERVED" || status === "CANCELLED"
            ? activeOrders.filter((o) => o.id !== orderId)
            : activeOrders,
        completedOrders:
          status === "SERVED" || status === "CANCELLED"
            ? [updatedOrder!, ...completedOrders]
            : completedOrders,
        selectedOrder:
          get().selectedOrder?.id === orderId
            ? (updatedOrder ?? null)
            : get().selectedOrder,
      };
    });
    get().calculateStats();
  },

  setSelectedOrder: (order) => set({ selectedOrder: order }),

  calculateStats: () => {
    const { activeOrders, completedOrders } = get();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const prepTimes = completedOrders
      .filter((o) => o.status === "SERVED")
      .map((o) => {
        const created = new Date(o.createdAt).getTime();
        const updated = new Date(o.updatedAt).getTime();
        return (updated - created) / 60000;
      })
      .filter((t) => t > 0);

    const stats = {
      activeCount: activeOrders.length,
      preparingCount: activeOrders.filter(
        (o) => o.status === "PREPARING",
      ).length,
      readyCount: activeOrders.filter((o) => o.status === "READY").length,
      completedToday: completedOrders.filter((o) => {
        const d = new Date(o.updatedAt);
        return d >= todayStart && o.status === "SERVED";
      }).length,
      averagePrepTime:
        prepTimes.length > 0
          ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
          : 0,
    };

    set({ stats });
  },

  clearCompleted: () => set({ completedOrders: [] }),
}));
