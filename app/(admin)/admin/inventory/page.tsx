"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventorySchema } from "@/lib/validations";
import type { ApiResponse, InventoryItem } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

type InventoryForm = {
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPrice: number;
  category?: string;
};

async function fetchInventory() {
  const res = await fetch("/api/inventory");
  const data: ApiResponse<InventoryItem[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: InventoryForm) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDialogOpen(false);
      toast.success("Item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, currentStock }: { id: string; currentStock: number }) => {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock }),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stock updated");
    },
  });

  const filtered = inventory?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const lowStock = filtered.filter((i) => i.currentStock <= i.minStock);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema) as any,
  });

  return (
    <FeatureGuard featureKey="INVENTORY">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500">
            Track stock levels and manage supplies
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name")} placeholder="Item name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input {...register("unit")} placeholder="pcs, kg, L" />
                </div>
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input type="number" step="0.01" {...register("costPrice", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input type="number" {...register("currentStock", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Min Stock</Label>
                  <Input type="number" {...register("minStock", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input {...register("category")} placeholder="e.g. Vegetables" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {lowStock.length} item(s) running low on stock
            </p>
            <p className="text-xs text-yellow-600">
              {lowStock.map((i) => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Stock Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isLow = item.currentStock <= item.minStock;
                return (
                  <TableRow
                    key={item.id}
                    className={cn(isLow && "bg-yellow-50/50")}
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          isLow && "text-yellow-600",
                        )}
                      >
                        {item.currentStock}
                      </span>
                      {isLow && (
                        <AlertTriangle className="ml-1 inline h-3 w-3 text-yellow-600" />
                      )}
                    </TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                    <TableCell>
                      {formatCurrency(item.currentStock * item.costPrice)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No inventory items
            </p>
          )}
        </div>
      )}
    </div>
    </FeatureGuard>
  );
}
