"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, QrCode, Printer, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeManager } from "@/components/admin/QRCodeManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import type { ApiResponse, Table, TableStatus } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

const tableSchema = z.object({
  tableNumber: z.coerce.number().positive(),
  capacity: z.coerce.number().positive().default(4),
});

type TableForm = z.infer<typeof tableSchema>;

async function fetchTables() {
  const res = await fetch("/api/tables");
  const data: ApiResponse<Table[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

const statusColors: Record<TableStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-red-100 text-red-800",
  RESERVED: "bg-blue-100 text-blue-800",
  CLEANING: "bg-yellow-100 text-yellow-800",
};

export default function TablesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null);
  const [addDialog, setAddDialog] = useState(false);

  const { data: tables, isLoading, refetch } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTables,
    refetchInterval: 10000,
  });

  const createTable = useMutation({
    mutationFn: async (data: TableForm) => {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setAddDialog(false);
      reset();
      toast.success("Table created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TableStatus }) => {
      const res = await fetch(`/api/tables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Table updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(tableSchema) as any,
    defaultValues: { capacity: 4 },
  });

  // Effective branchId
  const effectiveBranchId = session?.user?.branchId || tables?.[0]?.branchId || "";

  return (
    <FeatureGuard featureKey="TABLES">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-navy-900">Table Management</h1>
            <p className="text-sm text-gray-500">
              Manage floor layout, active statuses, and Table QR codes
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={addDialog} onOpenChange={setAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-navy-900 hover:bg-navy-800 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Table</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit((values) => createTable.mutate(values))}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-2">
                    <Label>Table Number</Label>
                    <Input
                      type="number"
                      {...register("tableNumber")}
                      placeholder="e.g. 1, 2, 3..."
                    />
                    {errors.tableNumber?.message && (
                      <p className="text-xs text-red-500">
                        {String(errors.tableNumber.message)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Seating Capacity</Label>
                    <Input
                      type="number"
                      {...register("capacity")}
                      placeholder="e.g. 4"
                    />
                    {errors.capacity?.message && (
                      <p className="text-xs text-red-500">
                        {String(errors.capacity.message)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-navy-900 text-white"
                    disabled={createTable.isPending}
                  >
                    {createTable.isPending ? "Creating..." : "Create Table"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables?.map((table) => (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading text-2xl font-bold text-navy-900">
                          Table {table.tableNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          Capacity: {table.capacity} seats
                        </p>
                      </div>
                      <Badge className={`text-xs px-2.5 py-0.5 ${statusColors[table.status]}`}>
                        {table.status}
                      </Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Select
                        value={table.status}
                        onValueChange={(v) =>
                          updateStatus.mutate({
                            id: table.id,
                            status: v as TableStatus,
                          })
                        }
                      >
                        <SelectTrigger className="flex-1 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AVAILABLE" className="text-xs">Available</SelectItem>
                          <SelectItem value="OCCUPIED" className="text-xs">Occupied</SelectItem>
                          <SelectItem value="RESERVED" className="text-xs">Reserved</SelectItem>
                          <SelectItem value="CLEANING" className="text-xs">Cleaning</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTableForQr(table)}
                        className="h-9 px-3 gap-1.5 text-xs font-semibold border-slate-300 text-navy-900 hover:bg-slate-50"
                        title="Generate or Manage Table QR"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>QR</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Full Table QR Code Manager Dialog */}
        {selectedTableForQr && (
          <QRCodeManager
            open={!!selectedTableForQr}
            onOpenChange={(open) => !open && setSelectedTableForQr(null)}
            type="TABLE"
            branchId={selectedTableForQr.branchId || effectiveBranchId}
            tableId={selectedTableForQr.id}
            tableName={`Table ${selectedTableForQr.tableNumber}`}
          />
        )}
      </div>
    </FeatureGuard>
  );
}
