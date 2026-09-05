"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  UtensilsCrossed,
  MapPin,
  Phone,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Trash2,
  X,
  Image as ImageIcon,
  Tag,
  RefreshCw,
  ArrowLeft,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem, MenuItemVariant, MenuItemAddon } from "@/types";

interface CustomerMenuProps {
  qrData: {
    token: string;
    type: "RESTAURANT_MENU" | "TABLE";
    tableName?: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    logo: string | null;
    phone: string | null;
    address: string | null;
    currency: string;
  };
  branch: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  };
  table?: {
    id: string;
    tableNumber: number;
    capacity: number;
  } | null;
  availableTables?: Array<{
    id: string;
    tableNumber: number;
    capacity: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    menuItems: MenuItem[];
  }>;
  paymentSettings?: {
    collectPaymentUpfront?: boolean;
    upiEnabled?: boolean;
    upiId?: string;
    payeeName?: string;
    qrImageUrl?: string;
    qrDisplayMode?: string;
    cashEnabled?: boolean;
    cardEnabled?: boolean;
  };
}

interface CartItemEntry {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  isVeg: boolean;
  selectedVariant?: MenuItemVariant;
  selectedAddons?: MenuItemAddon[];
  notes?: string;
}

export function CustomerMenu({
  qrData,
  restaurant,
  branch,
  table: initialTable,
  availableTables = [],
  categories: initialCategories,
  paymentSettings: initialPaymentSettings,
}: CustomerMenuProps) {
  const router = useRouter();
  const orderIdempotencyKey = useRef<string | null>(null);

  const paymentSettings = initialPaymentSettings || {
    collectPaymentUpfront: true,
    upiEnabled: true,
    upiId: "smartserve@upi",
    payeeName: restaurant.name || "SmartServe Restaurant",
    qrImageUrl: "",
    qrDisplayMode: "DYNAMIC",
    cashEnabled: true,
    cardEnabled: true,
  };

  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        router.back();
      } else if (document.referrer) {
        window.location.href = document.referrer;
      } else {
        router.push("/");
      }
    }
  }, [router]);

  // State
  const [categories, setCategories] = useState(initialCategories);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [filterVegOnly, setFilterVegOnly] = useState(false);

  // Table selection for Restaurant QR
  const [selectedTableId, setSelectedTableId] = useState<string>(
    initialTable?.id || (availableTables.length > 0 ? availableTables[0].id : "")
  );
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");

  // Cart state
  const [cart, setCart] = useState<CartItemEntry[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Payment Checkout & Confirmation States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"UPI" | "CASH" | "CARD">("UPI");
  const [paymentQrTab, setPaymentQrTab] = useState<"DYNAMIC" | "CUSTOM">(
    paymentSettings?.qrDisplayMode === "CUSTOM" && paymentSettings?.qrImageUrl ? "CUSTOM" : "DYNAMIC"
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState(false);

  // Auto-adjust selected payment method to match enabled options
  useEffect(() => {
    if (selectedPaymentMethod === "UPI" && !paymentSettings.upiEnabled) {
      if (paymentSettings.cashEnabled) setSelectedPaymentMethod("CASH");
      else if (paymentSettings.cardEnabled) setSelectedPaymentMethod("CARD");
    } else if (selectedPaymentMethod === "CASH" && !paymentSettings.cashEnabled) {
      if (paymentSettings.upiEnabled) setSelectedPaymentMethod("UPI");
      else if (paymentSettings.cardEnabled) setSelectedPaymentMethod("CARD");
    } else if (selectedPaymentMethod === "CARD" && !paymentSettings.cardEnabled) {
      if (paymentSettings.upiEnabled) setSelectedPaymentMethod("UPI");
      else if (paymentSettings.cashEnabled) setSelectedPaymentMethod("CASH");
    }
  }, [paymentSettings.upiEnabled, paymentSettings.cashEnabled, paymentSettings.cardEnabled, selectedPaymentMethod]);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    table?: string;
  } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(4);

  // Item customization dialog
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(undefined);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [itemNote, setItemNote] = useState("");

  // Customer Checkout Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Placed Orders Dialog State
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Array<{
    orderNumber: string;
    submittedAt: string;
    total: number | null;
    status?: string;
    table?: string;
  }>>([]);
  const [lookupOrderNumber, setLookupOrderNumber] = useState("");
  const [isLoadingOrderStatuses, setIsLoadingOrderStatuses] = useState(false);

  // Order Confirmation Auto-Redirect Timer
  useEffect(() => {
    if (!isConfirmedModalOpen || !confirmedOrder) return;
    if (redirectCountdown <= 0) {
      setIsConfirmedModalOpen(false);
      router.push(`/order/track/${confirmedOrder.orderNumber}`);
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isConfirmedModalOpen, redirectCountdown, confirmedOrder, router]);

  // Load saved recent orders from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("smartserve_recent_orders");
      if (stored) {
        setRecentOrders(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync recent order statuses with the server
  const refreshRecentOrderStatuses = useCallback(async () => {
    try {
      const stored = localStorage.getItem("smartserve_recent_orders");
      if (!stored) return;
      const orders = JSON.parse(stored);
      if (!Array.isArray(orders) || orders.length === 0) return;

      setIsLoadingOrderStatuses(true);
      const updatedOrders = await Promise.all(
        orders.map(async (ord: any) => {
          try {
            const res = await fetch(`/api/order/${ord.orderNumber}/status`, { cache: "no-store" });
            const json = await res.json();
            if (json.success && json.data) {
              return {
                ...ord,
                status: json.data.status,
                total: json.data.total ?? ord.total,
                table: json.data.table ? `Table ${json.data.table.tableNumber}` : ord.table,
              };
            }
          } catch {
            // Keep existing on failure
          }
          return ord;
        })
      );

      setRecentOrders(updatedOrders);
      localStorage.setItem("smartserve_recent_orders", JSON.stringify(updatedOrders));
    } catch {
      // ignore
    } finally {
      setIsLoadingOrderStatuses(false);
    }
  }, []);

  useEffect(() => {
    if (isOrdersModalOpen) {
      refreshRecentOrderStatuses();
    }
  }, [isOrdersModalOpen, refreshRecentOrderStatuses]);

  // Live menu refetch function (bypasses browser and server caches)
  const refetchMenu = useCallback(async (isSilent = false) => {
    if (!qrData?.token) return;
    if (!isSilent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/qr/${qrData.token}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.success && json.data?.categories) {
        setCategories(json.data.categories);
      }
    } catch (err) {
      console.error("Failed to refresh menu:", err);
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, [qrData?.token]);

  // Keep state in sync if parent props change
  useEffect(() => {
    if (initialCategories) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Refetch on mount
  useEffect(() => {
    refetchMenu(true);
  }, [refetchMenu]);

  // Refetch when page becomes visible or window is focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchMenu(true);
      }
    };
    const handleFocus = () => {
      refetchMenu(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchMenu]);

  // Background polling every 10 seconds to ensure live updates without requiring customer reload
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMenu(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchMenu]);

  // Persistent guest details
  useEffect(() => {
    try {
      const savedName = localStorage.getItem("smartserve_guest_name");
      const savedPhone = localStorage.getItem("smartserve_guest_phone");
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Total items in catalog
  const totalAllItems = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.menuItems.length, 0);
  }, [categories]);

  // Filter menu items
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        if (selectedCategoryId !== "ALL" && cat.id !== selectedCategoryId) {
          return null;
        }

        const items = cat.menuItems.filter((item) => {
          const matchesSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesVeg = filterVegOnly ? item.isVeg : true;
          return matchesSearch && matchesVeg;
        });

        if (items.length === 0) return null;

        return {
          ...cat,
          menuItems: items,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; menuItems: MenuItem[] }>;
  }, [categories, selectedCategoryId, searchQuery, filterVegOnly]);

  // Cart helper functions
  const getItemQuantityInCart = (itemId: string) => {
    return cart
      .filter((i) => i.menuItemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const handleQuickAdd = (item: MenuItem) => {
    const hasVariants = item.variants && (item.variants as MenuItemVariant[]).length > 0;
    const hasAddons = item.addons && (item.addons as MenuItemAddon[]).length > 0;

    if (hasVariants || hasAddons) {
      setCustomizingItem(item);
      setSelectedVariant((item.variants as MenuItemVariant[])?.[0]);
      setSelectedAddons([]);
      setItemNote("");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id && !i.selectedVariant);
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image,
          isVeg: item.isVeg,
        },
      ];
    });
  };

  const handleDecrement = (itemId: string) => {
    setCart((prev) => {
      const itemIndex = prev.findIndex((i) => i.menuItemId === itemId);
      if (itemIndex === -1) return prev;

      const target = prev[itemIndex];
      if (target.quantity > 1) {
        return prev.map((i, idx) =>
          idx === itemIndex ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((_, idx) => idx !== itemIndex);
    });
  };

  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return;

    const basePrice = selectedVariant ? selectedVariant.price : customizingItem.price;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const finalUnitPrice = basePrice + addonsTotal;

    const variantKey = selectedVariant ? selectedVariant.name : "default";
    const addonsKey = selectedAddons
      .map((a) => a.name)
      .sort()
      .join(",");

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.menuItemId === customizingItem.id &&
          (i.selectedVariant?.name || "default") === variantKey &&
          (i.selectedAddons?.map((a) => a.name).sort().join(",") || "") === addonsKey &&
          (i.notes || "") === (itemNote || "")
      );

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          menuItemId: customizingItem.id,
          name: customizingItem.name,
          price: finalUnitPrice,
          quantity: 1,
          image: customizingItem.image,
          isVeg: customizingItem.isVeg,
          selectedVariant,
          selectedAddons,
          notes: itemNote.trim() || undefined,
        },
      ];
    });

    setCustomizingItem(null);
  };

  // Cart calculations
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTax = Number((cartSubtotal * 0.05).toFixed(2));
  const cartTotal = Number((cartSubtotal + cartTax).toFixed(2));

  // Step 1: Proceed to Payment from Cart
  const handleProceedToPayment = () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setSubmitError("Please enter your name to proceed.");
      return;
    }
    if (!customerPhone.trim()) {
      setSubmitError("Please enter your phone number.");
      return;
    }

    if (qrData.type === "RESTAURANT_MENU" && orderType === "DINE_IN" && !selectedTableId) {
      if (availableTables.length > 0) {
        setSelectedTableId(availableTables[0].id);
      }
    }

    try {
      localStorage.setItem("smartserve_guest_name", customerName);
      localStorage.setItem("smartserve_guest_phone", customerPhone);
    } catch {
      // Ignore localStorage errors
    }

    setSubmitError(null);
    setIsCartOpen(false);
    setIsPaymentModalOpen(true);
  };

  // Step 2: Final Order Submission with Payment Method
  const handleExecuteOrderSubmit = async (
    method: "UPI" | "CASH" | "CARD" = selectedPaymentMethod,
    status: "PAID" | "PENDING" = method === "UPI" ? "PAID" : "PENDING",
    reference: string = paymentReference
  ) => {
    if (cart.length === 0) return;

    if (!navigator.onLine) {
      setSubmitError("You are offline. Your cart is saved; reconnect before placing or paying for this order.");
      return;
    }

    if (!orderIdempotencyKey.current) {
      orderIdempotencyKey.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `order-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/order/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: qrData.token,
          orderType,
          tableId:
            qrData.type === "TABLE"
              ? initialTable?.id
              : orderType === "DINE_IN"
              ? selectedTableId || availableTables[0]?.id
              : null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: orderNotes.trim() || undefined,
          paymentMethod: method === "CARD" ? "CREDIT_CARD" : method,
          paymentStatus: status,
          paymentReference: reference.trim() || undefined,
          idempotencyKey: orderIdempotencyKey.current,
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            selectedVariant: i.selectedVariant,
            selectedAddons: i.selectedAddons,
            notes: i.notes,
          })),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to submit order");
      }

      // Success: clear cart, save to recent orders
      const newOrderEntry = {
        orderNumber: json.data.orderNumber,
        submittedAt: new Date().toISOString(),
        total: json.data.total || cartTotal,
        status: json.data.status || "PENDING",
        paymentMethod: method,
        paymentStatus: status,
        table:
          qrData.type === "TABLE"
            ? qrData.tableName || `Table ${initialTable?.tableNumber || ""}`
            : orderType === "DINE_IN"
            ? selectedTableId
            : "Takeaway",
      };

      try {
        const stored = JSON.parse(localStorage.getItem("smartserve_recent_orders") || "[]");
        const nextOrders = [
          newOrderEntry,
          ...stored.filter((o: any) => o.orderNumber !== json.data.orderNumber),
        ].slice(0, 15);
        localStorage.setItem("smartserve_recent_orders", JSON.stringify(nextOrders));
        setRecentOrders(nextOrders);
      } catch {
        // ignore
      }

      setCart([]);
      orderIdempotencyKey.current = null;
      setIsPaymentModalOpen(false);

      // Open Order Confirmation Dialog
      setConfirmedOrder({
        orderNumber: json.data.orderNumber,
        total: json.data.total || cartTotal,
        paymentMethod: method,
        paymentStatus: status,
        table: newOrderEntry.table,
      });
      setIsConfirmedModalOpen(true);
      setRedirectCountdown(4);
    } catch (err: unknown) {
      console.error("Order submission failed:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-32 text-gray-900 font-sans antialiased selection:bg-gray-900 selection:text-white">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Go Back & Restaurant Info */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-100 hover:text-gray-900 active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {restaurant.logo ? (
                <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shrink-0 shadow-xs">
                  <Image
                    src={restaurant.logo}
                    alt={restaurant.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white font-bold text-lg shrink-0 shadow-xs">
                  {restaurant.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 font-heading tracking-tight leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                  <span>{branch.name}</span>
                  {branch.address && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{branch.address}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* QR Context Badge, Orders & Live Refresh */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchMenu(false)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                title="Refresh Menu"
              >
                <RefreshCw className={`h-3 w-3 text-gray-500 ${isRefreshing ? "animate-spin text-gray-900" : ""}`} />
                <span className="hidden sm:inline">{isRefreshing ? "Updating..." : "Live"}</span>
              </button>

              {/* View Orders Button */}
              <button
                type="button"
                onClick={() => setIsOrdersModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-navy-900 active:scale-95 transition-all cursor-pointer"
                title="View Orders"
              >
                <Receipt className="h-3.5 w-3.5 text-navy-900" />
                <span>Orders</span>
                {recentOrders.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-900 px-1 text-[10px] font-bold text-white">
                    {recentOrders.length}
                  </span>
                )}
              </button>

              {qrData.type === "TABLE" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {qrData.tableName || `Table ${initialTable?.tableNumber || ""}`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 shadow-xs">
                  <Sparkles className="h-3 w-3 text-primary-600" />
                  Full Menu QR
                </span>
              )}
            </div>
          </div>

          {/* Restaurant QR Controls: Order Type & Table Selection */}
          {qrData.type === "RESTAURANT_MENU" && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-gray-100">
              {/* Order Type Segmented Control */}
              <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOrderType("DINE_IN")}
                  className={`rounded-lg px-3.5 py-1.5 transition-all ${
                    orderType === "DINE_IN"
                      ? "bg-white text-gray-900 shadow-xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Dine In
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("TAKEAWAY")}
                  className={`rounded-lg px-3.5 py-1.5 transition-all ${
                    orderType === "TAKEAWAY"
                      ? "bg-white text-gray-900 shadow-xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Takeaway
                </button>
              </div>

              {/* Table Selector for Dine In */}
              {orderType === "DINE_IN" && availableTables.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-500">Select Table:</span>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="h-8 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 shadow-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer"
                  >
                    {availableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.tableNumber} ({t.capacity} Seats)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Bar & Veg Toggle Bar */}
        <div className="border-t border-gray-100 bg-white/95 px-4 py-2.5">
          <div className="mx-auto flex max-w-4xl items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dishes or drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Veg Only Filter Button */}
            <button
              type="button"
              onClick={() => setFilterVegOnly(!filterVegOnly)}
              className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                filterVegOnly
                  ? "bg-emerald-600 text-white border border-emerald-600 shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-xs"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                  filterVegOnly ? "border-white bg-emerald-700" : "border-emerald-600 bg-emerald-50"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    filterVegOnly ? "bg-white" : "bg-emerald-600"
                  }`}
                />
              </span>
              <span>Veg Only</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="mx-auto max-w-4xl pt-2.5 flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("ALL")}
              className={`shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
                selectedCategoryId === "ALL"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-xs"
              }`}
            >
              All Items ({totalAllItems})
            </button>

            {categories.map((cat) => {
              const count = cat.menuItems.length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-xs"
                  }`}
                >
                  <Tag className="h-3 w-3 opacity-60" />
                  <span>{cat.name}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Menu Item Content Section */}
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-3">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No dishes match your search</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || filterVegOnly
                ? "Try clearing your search query or toggling off the Veg Only filter."
                : "The restaurant menu is currently being prepared. Please check back shortly."}
            </p>
            {(searchQuery || filterVegOnly || selectedCategoryId !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterVegOnly(false);
                  setSelectedCategoryId("ALL");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-all"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 font-heading flex items-center gap-2">
                  <span>{category.name}</span>
                  <span className="text-xs font-medium text-gray-400">
                    ({category.menuItems.length} items)
                  </span>
                </h2>
              </div>

              {/* Grid of Dishes matching Admin Card Aesthetic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {category.menuItems.map((item) => {
                  const qtyInCart = getItemQuantityInCart(item.id);
                  const hasCustomization =
                    (item.variants && (item.variants as MenuItemVariant[]).length > 0) ||
                    (item.addons && (item.addons as MenuItemAddon[]).length > 0);

                  return (
                    <Card
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
                    >
                      {/* Top Dish Image / Icon Banner */}
                      <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                          </div>
                        )}

                        {/* Veg / Non-Veg Standard Indicator Badge */}
                        <div className="absolute left-2.5 top-2.5">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-sm border-2 bg-white/95 shadow-xs ${
                              item.isVeg ? "border-emerald-600" : "border-rose-600"
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                item.isVeg ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Badges for Featured / Trending */}
                        <div className="absolute right-2.5 top-2.5 flex gap-1">
                          {item.isFeatured && (
                            <span className="rounded-md bg-gray-900/90 text-white text-[10px] font-bold px-2 py-0.5 backdrop-blur-xs shadow-xs">
                              Featured
                            </span>
                          )}
                          {item.isTrending && (
                            <span className="rounded-md bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs">
                              Popular
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-heading font-semibold text-gray-900 text-base leading-snug">
                            {item.name}
                          </h3>
                          <p className="line-clamp-2 text-xs text-gray-500 mt-1 min-h-[32px] leading-relaxed">
                            {item.description || "Freshly prepared with authentic ingredients"}
                          </p>
                        </div>

                        {/* Card Footer: Price & Add Controls */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-base sm:text-lg font-bold text-gray-900">
                              {formatCurrency(item.price)}
                            </span>
                            {item.preparationTime && (
                              <span className="block text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {item.preparationTime} mins
                              </span>
                            )}
                          </div>

                          {/* Quick Add or Stepper */}
                          {qtyInCart > 0 && !hasCustomization ? (
                            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 p-1 shadow-xs">
                              <button
                                type="button"
                                onClick={() => handleDecrement(item.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs hover:bg-gray-50 active:scale-95 transition-all"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-[20px] text-center text-xs font-bold text-gray-900">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(item)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white shadow-xs hover:bg-gray-800 active:scale-95 transition-all"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(item)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-gray-800 active:scale-95 transition-all"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{hasCustomization ? "Customize" : "Add"}</span>
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3.5 sm:p-4 text-white shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white font-bold text-sm">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">
                      {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-emerald-400 font-medium">Ready to order</span>
                  </div>
                  <div className="text-base font-bold text-white leading-tight">
                    {formatCurrency(cartTotal)}
                    <span className="text-[11px] font-normal text-gray-400 ml-1">incl. tax</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-gray-900 shadow-md hover:bg-gray-100 active:scale-95 transition-all"
              >
                <span>View Cart</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customization Dialog */}
      <Dialog open={!!customizingItem} onOpenChange={(open) => !open && setCustomizingItem(null)}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 border-gray-200 rounded-3xl p-6 shadow-2xl">
          {customizingItem && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
                  <span>{customizingItem.name}</span>
                  <span className="text-sm font-semibold text-gray-600">
                    {formatCurrency(customizingItem.price)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Variants */}
              {customizingItem.variants && (customizingItem.variants as MenuItemVariant[]).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Select Size / Portion
                  </Label>
                  <div className="grid gap-2">
                    {(customizingItem.variants as MenuItemVariant[]).map((v) => (
                      <label
                        key={v.name}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                          selectedVariant?.name === v.name
                            ? "border-gray-900 bg-gray-50 text-gray-900 font-semibold shadow-xs"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="variant"
                            checked={selectedVariant?.name === v.name}
                            onChange={() => setSelectedVariant(v)}
                            className="accent-gray-900"
                          />
                          <span>{v.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(v.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {customizingItem.addons && (customizingItem.addons as MenuItemAddon[]).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Add-ons (Optional)
                  </Label>
                  <div className="grid gap-2">
                    {(customizingItem.addons as MenuItemAddon[]).map((addon) => {
                      const isChecked = selectedAddons.some((a) => a.name === addon.name);
                      return (
                        <label
                          key={addon.name}
                          className={`flex items-center justify-between rounded-xl border p-3 text-xs font-medium cursor-pointer transition-all ${
                            isChecked
                              ? "border-gray-900 bg-gray-50 text-gray-900 font-semibold shadow-xs"
                              : "border-gray-200 hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAddons([...selectedAddons, addon]);
                                } else {
                                  setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
                                }
                              }}
                              className="accent-gray-900 rounded"
                            />
                            <span>{addon.name}</span>
                          </div>
                          <span className="font-bold text-gray-800">+{formatCurrency(addon.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Item Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Special Instructions for Kitchen</Label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, no onions, extra crispy..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 shadow-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAddCustomizedToCart}
                className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Add to Cart
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart & Checkout Slide-Over Modal */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-3">
              <span>Your Cart ({totalItemCount})</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 border border-gray-200">
                {qrData.type === "TABLE"
                  ? qrData.tableName || `Table ${initialTable?.tableNumber}`
                  : orderType === "DINE_IN"
                  ? "Dine In"
                  : "Takeaway"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Cart Items List */}
          <div className="space-y-3 py-2">
            {cart.map((item, index) => (
              <div
                key={`${item.menuItemId}-${index}`}
                className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                        item.isVeg ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    />
                    <h4 className="text-sm font-bold text-gray-900">{item.name}</h4>
                  </div>
                  {item.selectedVariant && (
                    <p className="text-xs text-gray-500 font-medium">Portion: {item.selectedVariant.name}</p>
                  )}
                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Add-ons: {item.selectedAddons.map((a) => a.name).join(", ")}
                    </p>
                  )}
                  {item.notes && <p className="text-xs italic text-gray-400">Note: {item.notes}</p>}
                  <div className="text-xs font-bold text-gray-900 pt-0.5">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.quantity > 1) {
                          setCart((prev) =>
                            prev.map((it, idx) =>
                              idx === index ? { ...it, quantity: it.quantity - 1 } : it
                            )
                          );
                        } else {
                          setCart((prev) => prev.filter((_, idx) => idx !== index));
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-50 shadow-xs"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[18px] text-center text-xs font-bold text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCart((prev) =>
                          prev.map((it, idx) =>
                            idx === index ? { ...it, quantity: it.quantity + 1 } : it
                          )
                        );
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800 shadow-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== index))}
                    className="text-gray-400 hover:text-rose-500 p-1 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Details Form */}
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-xs">
            <h5 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
              Guest Contact Details
            </h5>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Your Full Name *</Label>
                <input
                  type="text"
                  placeholder="e.g. Satyam Mallik"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Phone Number *</Label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Special Cooking Request</Label>
              <input
                type="text"
                placeholder="Any dietary restrictions or instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
              />
            </div>
          </div>

          {/* Price Summary */}
          <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Item Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxes & GST (5%)</span>
              <span className="font-semibold text-gray-900">{formatCurrency(cartTax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-gray-900 border-t border-gray-200 pt-2.5">
              <span>Total Payable</span>
              <span className="text-base text-gray-900">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          {/* Error message */}
          {submitError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {submitError}
            </div>
          )}

          {/* Proceed / Submit Button */}
          <button
            type="button"
            onClick={
              paymentSettings?.collectPaymentUpfront !== false
                ? handleProceedToPayment
                : () => handleExecuteOrderSubmit("CASH", "PENDING", "")
            }
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-11 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing Order...
              </span>
            ) : paymentSettings?.collectPaymentUpfront !== false ? (
              <span className="flex items-center gap-1.5">
                <span>Proceed to Payment</span>
                <span>•</span>
                <span>{formatCurrency(cartTotal)}</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            ) : (
              <span>Place Order • {formatCurrency(cartTotal)}</span>
            )}
          </button>
        </DialogContent>
      </Dialog>

      {/* Payment Step Dialog (Before Place Order) */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 border-gray-200 rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>Payment & Checkout</span>
              </DialogTitle>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setIsCartOpen(true);
                }}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Cart</span>
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Amount Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Total Amount to Pay
              </span>
              <div className="text-3xl font-extrabold text-emerald-950 font-heading">
                {formatCurrency(cartTotal)}
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-700">
                <span>Subtotal: {formatCurrency(cartSubtotal)}</span>
                <span>•</span>
                <span>GST (5%): {formatCurrency(cartTax)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            {(() => {
              const enabledCount = [
                paymentSettings.upiEnabled,
                paymentSettings.cashEnabled,
                paymentSettings.cardEnabled,
              ].filter(Boolean).length;

              if (enabledCount === 0) return null;

              const gridColsClass =
                enabledCount === 1
                  ? "grid-cols-1"
                  : enabledCount === 2
                  ? "grid-cols-2"
                  : "grid-cols-3";

              return (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Payment Method
                  </Label>
                  <div className={`grid gap-2 ${gridColsClass}`}>
                    {paymentSettings.upiEnabled && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod("UPI")}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedPaymentMethod === "UPI"
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <QrCode className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs font-bold">UPI / QR</span>
                      </button>
                    )}

                    {paymentSettings.cashEnabled && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod("CASH")}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedPaymentMethod === "CASH"
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Banknote className="h-5 w-5 text-amber-600" />
                        <span className="text-xs font-bold">Cash</span>
                      </button>
                    )}

                    {paymentSettings.cardEnabled && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod("CARD")}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedPaymentMethod === "CARD"
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        <span className="text-xs font-bold">Card</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* UPI Payment Details & Dynamic QR Code */}
            {selectedPaymentMethod === "UPI" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5 text-center">
                <div className="space-y-1">
                  <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider">
                    Scan with any UPI App
                  </Badge>
                  <p className="text-xs text-slate-500">
                    Google Pay • PhonePe • Paytm • BHIM
                  </p>
                </div>

                {/* Tab Switcher if custom QR image exists */}
                {paymentSettings.qrImageUrl && (
                  <div className="mx-auto flex max-w-[220px] items-center justify-center gap-1 rounded-xl bg-slate-200/70 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentQrTab("DYNAMIC")}
                      className={`flex-1 rounded-lg py-1 px-2 font-medium text-[11px] transition-colors cursor-pointer ${
                        paymentQrTab === "DYNAMIC"
                          ? "bg-white text-slate-900 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Dynamic QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentQrTab("CUSTOM")}
                      className={`flex-1 rounded-lg py-1 px-2 font-medium text-[11px] transition-colors cursor-pointer ${
                        paymentQrTab === "CUSTOM"
                          ? "bg-white text-slate-900 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Uploaded QR
                    </button>
                  </div>
                )}

                {/* QR Code */}
                <div className="mx-auto w-48 h-48 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center relative overflow-hidden">
                  {paymentQrTab === "CUSTOM" && paymentSettings.qrImageUrl ? (
                    <img
                      src={paymentSettings.qrImageUrl}
                      alt="Uploaded Restaurant Payment QR Code"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(
                        `upi://pay?pa=${paymentSettings.upiId || "smartserve@upi"}&pn=${encodeURIComponent(
                          paymentSettings.payeeName || restaurant.name
                        )}&am=${cartTotal}&cu=INR&tn=${encodeURIComponent(
                          `Order at ${restaurant.name}`
                        )}`
                      )}`}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* UPI ID & Copy button */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                  <div className="text-left truncate">
                    <span className="text-[10px] text-slate-400 block">UPI ID</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {paymentSettings.upiId || "smartserve@upi"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(paymentSettings.upiId || "smartserve@upi");
                        toast.success("UPI ID copied!");
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                </div>

                {/* Deep-link Pay on Mobile */}
                <a
                  href={`upi://pay?pa=${paymentSettings.upiId || "smartserve@upi"}&pn=${encodeURIComponent(
                    paymentSettings.payeeName || restaurant.name
                  )}&am=${cartTotal}&cu=INR&tn=${encodeURIComponent(
                    `Order at ${restaurant.name}`
                  )}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                  <span>Open directly in UPI App</span>
                </a>

                {/* Optional Reference / UTR input */}
                <div className="space-y-1 text-left pt-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    UPI Transaction UTR / Ref (optional)
                  </Label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. 423589123456"
                    className="w-full h-8 px-3 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            )}

            {/* Cash Payment Details */}
            {selectedPaymentMethod === "CASH" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Banknote className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-amber-950">Pay at Counter / Cash</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Please proceed to the cashier desk or pay when served. Your order of{" "}
                  <strong>{formatCurrency(cartTotal)}</strong> will be sent to the kitchen right away.
                </p>
              </div>
            )}

            {/* Card Payment Details */}
            {selectedPaymentMethod === "CARD" && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-2 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-purple-950">Card on Table / Counter</h4>
                <p className="text-xs text-purple-800 leading-relaxed">
                  A card POS terminal will be brought to your table, or you can swipe at the billing desk.
                </p>
              </div>
            )}

            {submitError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {submitError}
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="button"
              onClick={() =>
                handleExecuteOrderSubmit(
                  selectedPaymentMethod,
                  selectedPaymentMethod === "UPI" ? "PAID" : "PENDING",
                  paymentReference
                )
              }
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing Order...
                </span>
              ) : selectedPaymentMethod === "UPI" ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I Have Paid {formatCurrency(cartTotal)} • Place Order</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Order ({selectedPaymentMethod === "CASH" ? "Pay at Counter" : "Card"})</span>
                </span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Screen */}
      <Dialog open={isConfirmedModalOpen} onOpenChange={setIsConfirmedModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 border-gray-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-xl font-extrabold text-slate-900 font-heading">
              Order Confirmed!
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Your order has been sent to the kitchen and will be prepared shortly.
            </p>
          </div>

          {confirmedOrder && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500">Order Number</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {confirmedOrder.orderNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(confirmedOrder.total)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Status</span>
                <Badge
                  className={`text-[10px] font-bold ${
                    confirmedOrder.paymentStatus === "PAID"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {confirmedOrder.paymentStatus === "PAID" ? "PAID" : "PAY AT COUNTER"}
                </Badge>
              </div>
              {confirmedOrder.table && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Serving Table</span>
                  <span className="font-semibold text-slate-800">{confirmedOrder.table}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button
              onClick={() => {
                setIsConfirmedModalOpen(false);
                if (confirmedOrder) {
                  router.push(`/order/track/${confirmedOrder.orderNumber}`);
                }
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-11 rounded-xl shadow-md gap-2 cursor-pointer"
            >
              <span>Track Order Live Now</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <p className="text-[11px] text-slate-400">
              Automatically redirecting to order tracking in{" "}
              <strong className="text-slate-700">{redirectCountdown}s</strong>...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Placed Orders Dialog */}
      <Dialog open={isOrdersModalOpen} onOpenChange={setIsOrdersModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 border-gray-200 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-navy-900">
                  <Receipt className="h-4 w-4" />
                </div>
                <span>Your Orders</span>
              </DialogTitle>
              {recentOrders.length > 0 && (
                <button
                  type="button"
                  onClick={refreshRecentOrderStatuses}
                  disabled={isLoadingOrderStatuses}
                  className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Refresh order statuses"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingOrderStatuses ? "animate-spin" : ""}`} />
                  <span>Update</span>
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Quick Order Lookup Form */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-gray-600">Track an Order by Number</label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!lookupOrderNumber.trim()) return;
                setIsOrdersModalOpen(false);
                router.push(`/order/track/${lookupOrderNumber.trim()}`);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={lookupOrderNumber}
                onChange={(e) => setLookupOrderNumber(e.target.value)}
                placeholder="e.g. ORD-260905-..."
                className="flex-1 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-xs"
              />
              <button
                type="submit"
                disabled={!lookupOrderNumber.trim()}
                className="h-9 px-4 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 transition-all cursor-pointer shrink-0"
              >
                Track
              </button>
            </form>
          </div>

          {/* Recent Orders List */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Recent Orders ({recentOrders.length})
              </span>
              {recentOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("smartserve_recent_orders");
                    setRecentOrders([]);
                  }}
                  className="text-[11px] text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear history
                </button>
              )}
            </div>

            {recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center space-y-2 bg-gray-50/50">
                <UtensilsCrossed className="mx-auto h-8 w-8 text-gray-300" />
                <p className="text-xs font-semibold text-gray-700">No recent orders yet</p>
                <p className="text-[11px] text-gray-500">
                  When you place an order from this menu, it will be saved here so you can track kitchen progress live.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                {recentOrders.map((ord) => (
                  <div
                    key={ord.orderNumber}
                    className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs hover:border-gray-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-gray-900 tracking-tight flex items-center gap-1.5">
                          <span>{ord.orderNumber}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(ord.submittedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {ord.table && (
                            <>
                              <span>•</span>
                              <span>{ord.table}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {ord.status && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            ord.status === "READY" || ord.status === "SERVED" || ord.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : ord.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {ord.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-900">
                        {ord.total ? formatCurrency(ord.total) : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOrdersModalOpen(false);
                          router.push(`/order/track/${ord.orderNumber}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy-900 hover:text-black transition-colors cursor-pointer"
                      >
                        <span>Track Live</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
