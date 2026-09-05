"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Table, TableStatus } from "@/types";

interface TableGridProps {
  tables: Table[];
  selected: string | null;
  onSelect: (tableId: string | null) => void;
}

const statusConfig: Record<TableStatus, { color: string; label: string }> = {
  AVAILABLE: {
    color: "bg-success-500 border-success-500",
    label: "Available",
  },
  OCCUPIED: {
    color: "bg-danger-500 border-danger-500",
    label: "Occupied",
  },
  RESERVED: {
    color: "bg-blue-500 border-blue-500",
    label: "Reserved",
  },
  CLEANING: {
    color: "bg-accent-500 border-accent-500",
    label: "Cleaning",
  },
};

export function TableGrid({ tables, selected, onSelect }: TableGridProps) {
  const available = tables.filter((t) => t.status === "AVAILABLE");
  const occupied = tables.filter((t) => t.status === "OCCUPIED");
  const reserved = tables.filter((t) => t.status === "RESERVED");
  const cleaning = tables.filter((t) => t.status === "CLEANING");

  const sections = [
    { label: "Occupied", tables: occupied, status: "OCCUPIED" as TableStatus },
    { label: "Reserved", tables: reserved, status: "RESERVED" as TableStatus },
    { label: "Available", tables: available, status: "AVAILABLE" as TableStatus },
    { label: "Cleaning", tables: cleaning, status: "CLEANING" as TableStatus },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        if (section.tables.length === 0) return null;
        return (
          <div key={section.status}>
            <h3 className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {section.label} ({section.tables.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {section.tables.map((table) => {
                const config = statusConfig[table.status];
                return (
                  <motion.button
                    key={table.id}
                    layout
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      onSelect(selected === table.id ? null : table.id)
                    }
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all duration-200",
                      selected === table.id
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 bg-white hover:shadow-md",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 h-3 w-3 rounded-full",
                        config.color,
                      )}
                    />
                    <span className="font-heading text-lg font-bold">
                      {table.tableNumber}
                    </span>
                    {table.status === "OCCUPIED" && (
                      <span className="text-[10px] text-danger-500 font-medium">
                        {table.status}
                      </span>
                    )}
                    {(table.status === "RESERVED" || table.status === "CLEANING") && (
                      <span className="text-[10px] font-medium">
                        {config.label}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}

      {tables.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">
          No tables configured yet
        </div>
      )}
    </div>
  );
}
