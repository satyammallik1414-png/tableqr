"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, Check, Edit3, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { SubscriptionPlanItem } from "@/types/super-admin";

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<SubscriptionPlanItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    monthlyPrice: "2999",
    yearlyPrice: "29990",
    maxBranches: "3",
    maxStaff: "15",
    maxCustomers: "1000",
    maxOrders: "5000",
    trialDays: "14",
    isActive: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/plans");
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch {
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditPlan(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      monthlyPrice: "2999",
      yearlyPrice: "29990",
      maxBranches: "3",
      maxStaff: "15",
      maxCustomers: "1000",
      maxOrders: "5000",
      trialDays: "14",
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlanItem) => {
    setEditPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice.toString(),
      yearlyPrice: plan.yearlyPrice.toString(),
      maxBranches: plan.maxBranches.toString(),
      maxStaff: plan.maxStaff.toString(),
      maxCustomers: plan.maxCustomers.toString(),
      maxOrders: plan.maxOrders.toString(),
      trialDays: plan.trialDays.toString(),
      isActive: plan.isActive,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const url = editPlan ? `/api/super-admin/plans/${editPlan.id}` : "/api/super-admin/plans";
      const method = editPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          monthlyPrice: parseFloat(formData.monthlyPrice),
          yearlyPrice: parseFloat(formData.yearlyPrice),
          maxBranches: parseInt(formData.maxBranches, 10),
          maxStaff: parseInt(formData.maxStaff, 10),
          maxCustomers: parseInt(formData.maxCustomers, 10),
          maxOrders: parseInt(formData.maxOrders, 10),
          trialDays: parseInt(formData.trialDays, 10),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Plan ${editPlan ? "updated" : "created"} successfully`);
        setIsOpen(false);
        fetchPlans();
      } else {
        toast.error(json.error || "Failed to save plan");
      }
    } catch {
      toast.error("Error saving subscription plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete subscription plan "${name}"?`)) return;
    try {
      const res = await fetch(`/api/super-admin/plans/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Plan deleted");
        fetchPlans();
      } else {
        toast.error(json.error || "Failed to delete plan");
      }
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Subscription Plans</h2>
          <p className="text-sm text-gray-500">Configure pricing plans, quotas, and feature flags for platform monetization.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
          <Plus className="mr-2 h-4 w-4" /> Create Plan
        </Button>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="relative flex flex-col justify-between rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={p.isActive ? "success" : "secondary"}>
                    {p.isActive ? "Active Plan" : "Disabled"}
                  </Badge>
                  <span className="text-xs text-gray-400 font-mono">/{p.slug}</span>
                </div>
                <CardTitle className="font-heading text-xl font-bold mt-2">{p.name}</CardTitle>
                <p className="text-xs text-gray-500">{p.description || "No description provided."}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(p.monthlyPrice)}</span>
                  <span className="text-xs text-gray-500">/ month</span>
                </div>
                <p className="text-xs text-gray-500">
                  Yearly: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(p.yearlyPrice)}</span> / yr
                </p>

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Max Branches: <strong>{p.maxBranches}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Max Staff Users: <strong>{p.maxStaff}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Max Customers: <strong>{p.maxCustomers}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Max Orders: <strong>{p.maxOrders}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Trial Period: <strong>{p.trialDays} days</strong></span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {p._count?.subscriptions || 0} Subscriptions
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(p)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Create/Edit Plan */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Plan Name *</Label>
              <Input
                required
                placeholder="Pro Plan"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setFormData({ ...formData, name, slug: editPlan ? formData.slug : slug });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Plan Slug *</Label>
              <Input
                required
                placeholder="pro-plan"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monthly Price (INR) *</Label>
                <Input
                  required
                  type="number"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Yearly Price (INR) *</Label>
                <Input
                  required
                  type="number"
                  value={formData.yearlyPrice}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Max Branches *</Label>
                <Input
                  required
                  type="number"
                  value={formData.maxBranches}
                  onChange={(e) => setFormData({ ...formData, maxBranches: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Max Staff Users *</Label>
                <Input
                  required
                  type="number"
                  value={formData.maxStaff}
                  onChange={(e) => setFormData({ ...formData, maxStaff: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Max Customers *</Label>
                <Input
                  required
                  type="number"
                  value={formData.maxCustomers}
                  onChange={(e) => setFormData({ ...formData, maxCustomers: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Max Orders *</Label>
                <Input
                  required
                  type="number"
                  value={formData.maxOrders}
                  onChange={(e) => setFormData({ ...formData, maxOrders: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
                {submitting ? "Saving..." : editPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
