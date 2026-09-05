"use client";

import { useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/types";

export function useCart() {
  const store = useCartStore();

  return {
    items: store.items,
    tableId: store.tableId,
    branchId: store.branchId,
    restaurantId: store.restaurantId,
    specialInstructions: store.specialInstructions,
    couponCode: store.couponCode,
    addItem: (item: CartItem) => store.addItem(item),
    removeItem: (menuItemId: string) => store.removeItem(menuItemId),
    updateQuantity: (menuItemId: string, quantity: number) =>
      store.updateQuantity(menuItemId, quantity),
    updateNotes: (menuItemId: string, notes: string) =>
      store.updateNotes(menuItemId, notes),
    clearCart: () => store.clearCart(),
    setTableId: (tableId: string) => store.setTableId(tableId),
    setBranchId: (branchId: string) => store.setBranchId(branchId),
    setRestaurantId: (restaurantId: string) =>
      store.setRestaurantId(restaurantId),
    setSpecialInstructions: (instructions: string) =>
      store.setSpecialInstructions(instructions),
    setCouponCode: (code: string) => store.setCouponCode(code),
    getTotal: () => store.getTotal(),
    getSubtotal: () => store.getSubtotal(),
    getCount: () => store.getCount(),
    getItemQuantity: (menuItemId: string) =>
      store.getItemQuantity(menuItemId),
  };
}
