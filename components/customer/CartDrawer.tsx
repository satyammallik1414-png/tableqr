"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cartStore";
import { usePlaceOrder } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Order } from "@/types";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderPlaced: (order: Order) => void;
}

export function CartDrawer({ open, onOpenChange, onOrderPlaced }: CartDrawerProps) {
  const [couponCode, setCouponCode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placing, setPlacing] = useState(false);

  const { items, getSubtotal, getCount, clearCart, updateQuantity, removeItem, updateNotes, tableId, branchId } = useCartStore();
  const placeOrder = usePlaceOrder();

  const subtotal = getSubtotal();
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const order = await placeOrder.mutateAsync({
        tableId,
        branchId,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          variants: item.variants,
          addons: item.addons,
          notes: item.notes,
          isVeg: item.isVeg,
          image: item.image,
        })),
        subtotal,
        tax,
        serviceCharge: 0,
        total,
        notes: specialInstructions,
        couponCode: couponCode || undefined,
      });

      clearCart();
      onOrderPlaced(order);
      toast.success("Order placed successfully!");
    } catch {
      toast.error("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-gray-600" />
                <h2 className="font-heading text-lg font-bold">
                  Your Cart ({getCount()})
                </h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600:bg-gray-800"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <ShoppingBag className="mx-auto h-12 w-12 opacity-30" />
                  <p className="mt-2">Your cart is empty</p>
                  <p className="text-sm">Add items from the menu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.menuItemId}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3/50"
                    >
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-medium">{item.name}</h4>
                            {item.variants && item.variants.length > 0 && (
                              <p className="text-xs text-gray-500">
                                {item.variants[0].name}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.menuItemId)}
                            className="text-gray-400 hover:text-danger-500"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-xl bg-white px-2 py-1 shadow-sm">
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItemId, item.quantity - 1)
                              }
                              className="p-0.5 text-gray-500 hover:text-gray-700"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItemId, item.quantity + 1)
                              }
                              className="p-0.5 text-gray-500 hover:text-gray-700"
                              aria-label="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>

                        {/* Item notes */}
                        <input
                          type="text"
                          placeholder="Add note..."
                          value={item.notes}
                          onChange={(e) =>
                            updateNotes(item.menuItemId, e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border-none bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none focus:ring-0"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4">
                {/* Special Instructions */}
                <Textarea
                  placeholder="Special instructions for the kitchen..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="mb-3 min-h-[60px] text-sm"
                />

                {/* Coupon */}
                <div className="mb-3 flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button variant="outline" size="sm" className="shrink-0">
                    Apply
                  </Button>
                </div>

                <Separator className="my-3" />

                {/* Totals */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tax (5%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-heading text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full py-6 text-base"
                  onClick={handlePlaceOrder}
                  disabled={placing}
                >
                  {placing ? "Placing Order..." : `Place Order - ${formatCurrency(total)}`}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
