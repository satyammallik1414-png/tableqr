"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Gift, Plus, Percent, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { LOYALTY_TIERS } from "@/lib/constants";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { couponSchema } from "@/lib/validations";
import { z } from "zod";
import type { ApiResponse, Coupon } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

type CouponForm = z.infer<typeof couponSchema>;

async function fetchCoupons() {
  const res = await fetch("/api/coupons");
  const data: ApiResponse<Coupon[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: fetchCoupons,
  });

  const createCoupon = useMutation({
    mutationFn: async (formData: CouponForm) => {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setDialogOpen(false);
      toast.success("Coupon created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CouponForm>({
    resolver: zodResolver(couponSchema) as any,
  });

  return (
    <FeatureGuard featureKey="LOYALTY">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Loyalty & Coupons</h1>
          <p className="text-sm text-gray-500">
            Manage loyalty tiers and promotional coupons
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit((values) => createCoupon.mutate(values))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input {...register("code")} placeholder="e.g. WELCOME20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    onValueChange={(v) => setValue("discountType", v as "PERCENTAGE" | "FLAT")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FLAT">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input type="number" step="0.01" {...register("discountValue", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Order</Label>
                  <Input type="number" step="0.01" {...register("minOrder", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses</Label>
                  <Input type="number" {...register("maxUses", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" {...register("expiresAt")} />
              </div>
              <Button type="submit" className="w-full" disabled={createCoupon.isPending}>
                {createCoupon.isPending ? "Creating..." : "Create Coupon"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loyalty Tiers */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold">Loyalty Tiers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOYALTY_TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                    <Gift className="h-7 w-7 text-gray-600" />
                  </div>
                  <CardTitle className="mt-2">{tier.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-heading text-2xl font-bold">
                    {tier.discount}%
                  </p>
                  <p className="text-sm text-gray-500">
                    Min {tier.minPoints} points
                  </p>
                  <p className="text-xs text-gray-400">
                    {(tier.perks as unknown as string[])?.join(", ") || "No perks"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-semibold">Active Coupons</h2>
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold uppercase">
                      {coupon.code}
                    </TableCell>
                    <TableCell>
                      {coupon.discountType === "PERCENTAGE"
                        ? `${coupon.discountValue}%`
                        : formatCurrency(coupon.discountValue)}
                    </TableCell>
                    <TableCell>
                      {coupon.usedCount}/{coupon.maxUses}
                    </TableCell>
                    <TableCell>{formatCurrency(coupon.minOrder)}</TableCell>
                    <TableCell>
                      {coupon.expiresAt
                        ? formatDate(coupon.expiresAt)
                        : "No expiry"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={coupon.isActive ? "success" : "secondary"}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!coupons || coupons.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-500">
                No coupons created yet
              </p>
            )}
          </div>
        )}
      </div>
    </div>
    </FeatureGuard>
  );
}
