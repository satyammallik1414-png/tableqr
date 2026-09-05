"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuCard } from "@/components/customer/MenuCard";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { OrderTracker } from "@/components/customer/OrderTracker";
import { CategoryFilter } from "@/components/customer/CategoryFilter";
import { WaiterRequest } from "@/components/customer/WaiterRequest";
import { useCartStore } from "@/store/cartStore";
import { useSocket } from "@/hooks/useSocket";
import type { ApiResponse, Category, MenuItem, Order } from "@/types";

async function fetchMenu(tableId: string) {
  const res = await fetch(`/api/menu?tableId=${tableId}`);
  const data: ApiResponse<{ categories: Category[]; items: MenuItem[] }> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function CustomerMenuPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showTracker, setShowTracker] = useState(false);

  const cartCount = useCartStore((s) => s.getCount());
  const items = useCartStore((s) => s.items);
  const setTableId = useCartStore((s) => s.setTableId);
  const setBranchId = useCartStore((s) => s.setBranchId);

  const { data: menuData, isLoading } = useQuery({
    queryKey: ["menu", tableId],
    queryFn: () => fetchMenu(tableId),
  });

  useSocket({
    tableId,
    enabled: !!activeOrder,
    branchId: menuData?.categories[0]?.branchId,
  });

  useEffect(() => {
    setTableId(tableId);
    if (menuData?.categories[0]?.branchId) {
      setBranchId(menuData.categories[0].branchId);
    }
  }, [tableId, menuData, setTableId, setBranchId]);

  const filteredItems = menuData?.items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && item.isAvailable;
  }) ?? [];

  const featuredItems = menuData?.items.filter((i) => i.isFeatured && i.isAvailable) ?? [];
  const trendingItems = menuData?.items.filter((i) => i.isTrending && i.isAvailable) ?? [];
  const recommendedItems = menuData?.items.filter((i) => i.isRecommended && i.isAvailable) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200/50 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white font-bold text-sm">
              SS
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">SmartServe AI</h1>
              <Badge variant="outline" className="text-xs">
                Table #{tableId}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
            aria-label={`Cart with ${cartCount} items`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="sticky top-16 z-20 bg-white px-4 pb-3 pt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-36 z-10 bg-white px-4 pb-2">
        <CategoryFilter
          categories={menuData?.categories ?? []}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <div className="space-y-8 px-4">
        {/* Featured Items */}
        {featuredItems.length > 0 && !selectedCategory && !searchQuery && (
          <section>
            <h2 className="mb-3 font-heading text-lg font-bold">Featured</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
              {featuredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="min-w-[240px] snap-start"
                >
                  <MenuCard item={item} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Items */}
        {trendingItems.length > 0 && !selectedCategory && !searchQuery && (
          <section>
            <h2 className="mb-3 font-heading text-lg font-bold">Trending 🔥</h2>
            <div className="grid grid-cols-2 gap-3">
              {trendingItems.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Recommended Items */}
        {recommendedItems.length > 0 && !selectedCategory && !searchQuery && (
          <section>
            <h2 className="mb-3 font-heading text-lg font-bold">Recommended</h2>
            <div className="grid grid-cols-2 gap-3">
              {recommendedItems.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Full Menu by Category */}
        {menuData?.categories.map((category) => {
          const catItems = filteredItems.filter(
            (item) => item.categoryId === category.id,
          );
          if (catItems.length === 0) return null;
          return (
            <section key={category.id}>
              <h2 className="mb-3 font-heading text-lg font-bold">
                {category.name}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {catItems.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="py-20 text-center text-gray-500">
            <p>No items found</p>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        onOrderPlaced={(order) => {
          setActiveOrder(order);
          setShowTracker(true);
          setCartOpen(false);
        }}
      />

      {/* Order Tracker */}
      <AnimatePresence>
        {showTracker && activeOrder && (
          <OrderTracker
            order={activeOrder}
            onClose={() => setShowTracker(false)}
          />
        )}
      </AnimatePresence>

      {/* Waiter Request FAB */}
      {!showTracker && (
        <WaiterRequest tableId={tableId} branchId={menuData?.categories[0]?.branchId ?? ""} />
      )}
    </div>
  );
}
