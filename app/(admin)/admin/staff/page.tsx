"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StaffTable } from "@/components/admin/StaffTable";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffSchema } from "@/lib/validations";
import { z } from "zod";
import type { ApiResponse, User, UserRole } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

type StaffForm = z.infer<typeof staffSchema>;

async function fetchStaff() {
  const res = await fetch("/api/staff");
  const data: ApiResponse<User[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: fetchStaff,
  });

  const inviteMutation = useMutation({
    mutationFn: async (formData: StaffForm) => {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDialogOpen(false);
      toast.success("Staff invited");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/staff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff status updated");
    },
  });

  const filtered = staff?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
  });

  return (
    <FeatureGuard featureKey="STAFF">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Manage your team members and their roles
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Staff Member</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit((values) => inviteMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name")} placeholder="Full name" />
                {errors.name && (
                  <p className="text-xs text-danger-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} type="email" placeholder="email@example.com" />
                {errors.email && (
                  <p className="text-xs text-danger-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  onValueChange={(v) => setValue("role", v as "MANAGER" | "KITCHEN" | "CASHIER" | "WAITER")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="KITCHEN">Kitchen</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="WAITER">Waiter</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-danger-500">{errors.role.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <StaffTable
          staff={filtered}
          onEdit={(user) => {
            toast.success(`Edit ${user.name} - feature coming soon`);
          }}
          onToggleActive={(user) =>
            toggleActive.mutate({ id: user.id, isActive: !user.isActive })
          }
        />
      )}
    </div>
    </FeatureGuard>
  );
}
