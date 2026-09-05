import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartState } from "@/types";

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  setTableId: (tableId: string) => void;
  setBranchId: (branchId: string) => void;
  setRestaurantId: (restaurantId: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setCouponCode: (code: string) => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getCount: () => number;
  getItemQuantity: (menuItemId: string) => number;
}

type CartStore = CartState & CartActions;

const initialState: CartState = {
  items: [],
  tableId: null,
  branchId: null,
  restaurantId: null,
  specialInstructions: "",
  couponCode: "",
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (item) => {
        const { items } = get();
        const existing = items.find(
          (i) => i.menuItemId === item.menuItemId,
        );

        if (existing) {
          set({
            items: items.map((i) =>
              i.menuItemId === item.menuItemId
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] });
        }
      },

      removeItem: (menuItemId) => {
        set({ items: get().items.filter((i) => i.menuItemId !== menuItemId) });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity } : i,
          ),
        });
      },

      updateNotes: (menuItemId, notes) => {
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, notes } : i,
          ),
        });
      },

      clearCart: () => set(initialState),

      setTableId: (tableId) => set({ tableId }),
      setBranchId: (branchId) => set({ branchId }),
      setRestaurantId: (restaurantId) => set({ restaurantId }),
      setSpecialInstructions: (instructions) =>
        set({ specialInstructions: instructions }),
      setCouponCode: (code) => set({ couponCode: code }),

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = subtotal * 0.05;
        return subtotal + tax;
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
      },

      getCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getItemQuantity: (menuItemId) => {
        const item = get().items.find((i) => i.menuItemId === menuItemId);
        return item?.quantity ?? 0;
      },
    }),
    {
      name: "smartserve-cart",
      partialize: (state) => ({
        items: state.items,
        tableId: state.tableId,
        branchId: state.branchId,
        restaurantId: state.restaurantId,
        specialInstructions: state.specialInstructions,
        couponCode: state.couponCode,
      }),
    },
  ),
);
