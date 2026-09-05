"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Clock, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency, truncate } from "@/lib/utils";
import type { MenuItem, MenuItemVariant, MenuItemAddon } from "@/types";

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  const [quantity, setQuantity] = useState(0);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  const displayPrice = selectedVariant ? selectedVariant.price : item.price;
  const hasVariants = item.variants && item.variants.length > 0;

  const handleAddToCart = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      image: item.image,
      price: displayPrice,
      quantity: 1,
      variants: selectedVariant ? [selectedVariant] : null,
      addons: selectedAddons.length > 0 ? selectedAddons : null,
      notes: "",
      isVeg: item.isVeg,
      preparationTime: item.preparationTime,
    });
    setQuantity((q) => q + 1);
  };

  const handleUpdateQuantity = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty <= 0) {
      setQuantity(0);
      return;
    }
    addItem({
      menuItemId: item.id,
      name: item.name,
      image: item.image,
      price: displayPrice,
      quantity: delta,
      variants: selectedVariant ? [selectedVariant] : null,
      addons: selectedAddons.length > 0 ? selectedAddons : null,
      notes: "",
      isVeg: item.isVeg,
      preparationTime: item.preparationTime,
    });
    setQuantity(newQty);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="group rounded-2xl border border-gray-200 bg-white transition-all"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-gray-100">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <Clock className="h-8 w-8" />
          </div>
        )}

        {/* Veg/Non-veg indicator */}
        <div className="absolute left-2 top-2">
          <div
            className={`h-5 w-5 rounded-full border-2 ${
              item.isVeg
                ? "border-success-500 bg-success-100"
                : "border-danger-500 bg-danger-100"
            } flex items-center justify-center`}
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                item.isVeg ? "bg-success-500" : "bg-danger-500"
              }`}
            />
          </div>
        </div>

        {/* Prep time badge */}
        {item.preparationTime && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm/80"
          >
            <Clock className="mr-1 h-3 w-3" />
            {item.preparationTime} min
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-heading font-semibold text-gray-900">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 text-xs text-gray-500">
            {truncate(item.description, 60)}
          </p>
        )}

        {/* Variants */}
        {hasVariants && (
          <div className="mt-2">
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="flex items-center gap-1 text-xs font-medium text-gray-600"
            >
              {showVariants ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {selectedVariant ? selectedVariant.name : "Select size"}
            </button>
            {showVariants && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-1 space-y-1"
              >
                {(item.variants as MenuItemVariant[]).map((v) => (
                  <button
                    key={v.name}
                    onClick={() => {
                      setSelectedVariant(v);
                      setShowVariants(false);
                    }}
                    className={`w-full rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                      selectedVariant?.name === v.name
                        ? "bg-gray-100 text-gray-900"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {v.name} - {formatCurrency(v.price)}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Add-ons preview */}
        {item.addons && (item.addons as MenuItemAddon[]).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {(item.addons as MenuItemAddon[]).slice(0, 2).map((a) => (
              <Badge key={a.name} variant="outline" className="text-[10px]">
                +{formatCurrency(a.price)}
              </Badge>
            ))}
            {(item.addons as MenuItemAddon[]).length > 2 && (
              <Badge variant="outline" className="text-[10px]">
                +{(item.addons as MenuItemAddon[]).length - 2} more
              </Badge>
            )}
          </div>
        )}

        {/* Price & Add to cart */}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-heading text-lg font-bold text-gray-900">
            {formatCurrency(displayPrice)}
          </span>

          {quantity > 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-1">
              <button
                onClick={() => handleUpdateQuantity(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="min-w-[20px] text-center text-sm font-bold text-gray-900">
                {quantity}
              </span>
              <button
                onClick={() => handleUpdateQuantity(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="h-8 px-3"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
