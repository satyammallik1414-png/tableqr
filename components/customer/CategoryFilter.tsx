"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            !selected
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100",
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() =>
              onSelect(selected === category.id ? null : category.id)
            }
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              selected === category.id
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
}
