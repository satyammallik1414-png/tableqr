"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Building2, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ApiResponse, Branch } from "@/types";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

async function fetchBranches() {
  const res = await fetch("/api/branches");
  const data: ApiResponse<Branch[]> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
  });

  return (
    <FeatureGuard featureKey="BRANCHES">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Branches</h1>
          <p className="text-sm text-gray-500">
            Manage your restaurant locations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">
              Branch creation functionality coming soon.
            </p>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches?.map((branch) => (
            <motion.div
              key={branch.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{branch.name}</CardTitle>
                        <p className="text-xs text-gray-500">
                          Created {formatDate(branch.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={branch.isActive ? "success" : "secondary"}>
                      {branch.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {branch.address && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="h-4 w-4" />
                      {branch.address}
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone className="h-4 w-4" />
                      {branch.phone}
                    </div>
                  )}
                  {branch.managerId && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <User className="h-4 w-4" />
                      Manager assigned
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </FeatureGuard>
  );
}
