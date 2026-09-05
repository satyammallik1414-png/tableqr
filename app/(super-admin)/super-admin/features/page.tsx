"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import {
  SlidersHorizontal,
  Building2,
  Users,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Layers,
  Activity,
  ArrowUpDown,
  Lock,
  Globe,
  Store,
  UserCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { FeatureKey, FEATURE_CATALOG } from "@/lib/features";
import { usePermissionStore } from "@/store/permissionStore";

interface FeatureItem {
  key: FeatureKey;
  name: string;
  description: string;
  category: string;
  defaultRoute: string;
  globalEnabled: boolean;
  globalUpdatedAt?: string;
  globalUpdatedBy?: string;
  businessOverridesCount: number;
  userOverridesCount: number;
}

interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status: string;
  overridesCount: number;
  usersCount: number;
  branchesCount: number;
}

interface BusinessFeatureDetail {
  key: FeatureKey;
  name: string;
  description: string;
  category: string;
  hasOverride: boolean;
  overrideEnabled: boolean | null;
  effectiveStatus: "ENABLED" | "GLOBALLY_DISABLED" | "BUSINESS_DISABLED" | "USER_DISABLED";
  isEnabled: boolean;
  reason: string;
}

interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  restaurantId?: string;
  restaurantName?: string;
  overridesCount: number;
}

interface UserFeatureDetail {
  key: FeatureKey;
  name: string;
  description: string;
  category: string;
  hasOverride: boolean;
  overrideEnabled: boolean | null;
  effectiveStatus: "ENABLED" | "GLOBALLY_DISABLED" | "BUSINESS_DISABLED" | "USER_DISABLED";
  isEnabled: boolean;
  reason: string;
}

interface AuditLogItem {
  id: string;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export default function SuperAdminFeaturesPage() {
  const [activeTab, setActiveTab] = useState<"global" | "business" | "user" | "audit">("global");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Global State
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [confirmGlobalKey, setConfirmGlobalKey] = useState<FeatureKey | null>(null);

  // Business State
  const [businessSearch, setBusinessSearch] = useState("");
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSummary | null>(null);
  const [businessFeatures, setBusinessFeatures] = useState<BusinessFeatureDetail[]>([]);
  const [selectedBusinessesForBulk, setSelectedBusinessesForBulk] = useState<string[]>([]);
  const [bulkFeatureKey, setBulkFeatureKey] = useState<FeatureKey>("BRANCHES");
  const [bulkFeatureEnabled, setBulkFeatureEnabled] = useState(true);

  // User State
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [userFeatures, setUserFeatures] = useState<UserFeatureDetail[]>([]);

  // Load initial global feature data
  const loadGlobalData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/features");
      const json = await res.json();
      if (json.success) {
        setFeatures(json.data.features || []);
        setAuditLogs(json.data.auditLogs || []);
      } else {
        toast.error(json.error || "Failed to load features");
      }
    } catch {
      toast.error("Network error loading features");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData]);

  const selectUser = useCallback(async (user: UserSummary) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`/api/super-admin/features/user?userId=${user.id}`);
      const json = await res.json();
      if (json.success) {
        setUserFeatures(json.data.features || []);
      }
    } catch {
      toast.error("Failed to load user feature details");
    }
  }, []);

  const selectBusiness = useCallback(async (business: BusinessSummary) => {
    setSelectedBusiness(business);
    try {
      const res = await fetch(`/api/super-admin/features/business?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) {
        setBusinessFeatures(json.data.features || []);
      }
      // Also fetch users for this business
      const uRes = await fetch(`/api/super-admin/features/user?businessId=${business.id}`);
      const uJson = await uRes.json();
      if (uJson.success) {
        setUsers(uJson.data || []);
        if (uJson.data?.length > 0) {
          selectUser(uJson.data[0]);
        } else {
          setSelectedUser(null);
          setUserFeatures([]);
        }
      }
    } catch {
      toast.error("Failed to load business feature details");
    }
  }, [selectUser]);

  // Search businesses when in business or user tab
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/super-admin/features/business?q=${encodeURIComponent(businessSearch)}`);
        const json = await res.json();
        if (json.success) {
          setBusinesses(json.data || []);
          if (json.data?.length > 0) {
            setSelectedBusiness((prev) => {
              if (!prev) {
                selectBusiness(json.data[0]);
              }
              return prev;
            });
          }
        }
      } catch {
        // silent search error
      }
    }, 300);
    return () => clearTimeout(searchTimer);
  }, [businessSearch, selectBusiness]);

  // Toggle Global Feature
  const handleToggleGlobal = async (key: FeatureKey, targetState: boolean) => {
    if (!targetState) {
      // Prompt confirmation dialog before disabling globally
      setConfirmGlobalKey(key);
      return;
    }
    await executeGlobalToggle(key, true);
  };

  const executeGlobalToggle = async (key: FeatureKey, enabled: boolean) => {
    try {
      const res = await fetch("/api/super-admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: key, enabled }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        usePermissionStore.getState().broadcastChange(key, enabled);
        setFeatures((prev) =>
          prev.map((f) => (f.key === key ? { ...f, globalEnabled: enabled } : f))
        );
        // Refresh audit logs
        loadGlobalData();
        // If a business is selected, refresh its matrix
        if (selectedBusiness) selectBusiness(selectedBusiness);
      } else {
        toast.error(json.error || "Failed to update feature");
      }
    } catch {
      toast.error("Error updating global feature");
    } finally {
      setConfirmGlobalKey(null);
    }
  };

  // Toggle Business Override
  const handleToggleBusinessOverride = async (key: FeatureKey, enabled: boolean) => {
    if (!selectedBusiness) return;
    try {
      const res = await fetch("/api/super-admin/features/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          featureKey: key,
          enabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        usePermissionStore.getState().broadcastChange(key, enabled);
        selectBusiness(selectedBusiness);
      } else {
        toast.error(json.error || "Failed to update override");
      }
    } catch {
      toast.error("Error setting business override");
    }
  };

  // Reset Business Override
  const handleResetBusinessOverride = async (key: FeatureKey) => {
    if (!selectedBusiness) return;
    try {
      const res = await fetch(
        `/api/super-admin/features/business?businessId=${selectedBusiness.id}&featureKey=${key}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        usePermissionStore.getState().broadcastChange(key);
        selectBusiness(selectedBusiness);
      } else {
        toast.error(json.error || "Failed to reset override");
      }
    } catch {
      toast.error("Error resetting business override");
    }
  };

  // Toggle User Override
  const handleToggleUserOverride = async (key: FeatureKey, enabled: boolean) => {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/super-admin/features/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          featureKey: key,
          enabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        usePermissionStore.getState().broadcastChange(key, enabled);
        selectUser(selectedUser);
      } else {
        toast.error(json.error || "Failed to update user override");
      }
    } catch {
      toast.error("Error setting user override");
    }
  };

  // Reset User Override
  const handleResetUserOverride = async (key: FeatureKey) => {
    if (!selectedUser) return;
    try {
      const res = await fetch(
        `/api/super-admin/features/user?userId=${selectedUser.id}&featureKey=${key}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        usePermissionStore.getState().broadcastChange(key);
        selectUser(selectedUser);
      } else {
        toast.error(json.error || "Failed to reset user override");
      }
    } catch {
      toast.error("Error resetting user override");
    }
  };

  // Bulk Apply
  const handleBulkApply = async () => {
    if (selectedBusinessesForBulk.length === 0) {
      toast.error("Select at least one business");
      return;
    }
    try {
      const res = await fetch("/api/super-admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessIds: selectedBusinessesForBulk,
          featureKey: bulkFeatureKey,
          enabled: bulkFeatureEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        usePermissionStore.getState().broadcastChange(bulkFeatureKey, bulkFeatureEnabled);
        setSelectedBusinessesForBulk([]);
        if (selectedBusiness) selectBusiness(selectedBusiness);
      } else {
        toast.error(json.error || "Failed to apply bulk update");
      }
    } catch {
      toast.error("Error applying bulk feature changes");
    }
  };

  const getEffectiveBadge = (status: string) => {
    switch (status) {
      case "ENABLED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">Active / Enabled</Badge>;
      case "GLOBALLY_DISABLED":
        return <Badge variant="destructive" className="font-semibold">Globally Disabled</Badge>;
      case "BUSINESS_DISABLED":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">Business Disabled</Badge>;
      case "USER_DISABLED":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">User Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mb-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Central Feature Control Catalog
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Feature Flags & Access Control
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Control modules and permissions across the platform: Globally, per Business Account, and per Individual User with strict hierarchical enforcement.
          </p>
        </div>

        {/* Global Summary Metrics */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium gap-1.5">
            <Layers className="h-3.5 w-3.5 text-gray-400" />
            11 Core Modules
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium gap-1.5 border-emerald-200 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {features.filter((f) => f.globalEnabled).length} Active Globally
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab("global")}
          className={`pb-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "global"
              ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Globe className="h-4 w-4" />
          Global Feature Catalog
        </button>
        <button
          onClick={() => setActiveTab("business")}
          className={`pb-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "business"
              ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Store className="h-4 w-4" />
          Business Overrides
        </button>
        <button
          onClick={() => setActiveTab("user")}
          className={`pb-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "user"
              ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          User Overrides
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "audit"
              ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400"
          }`}
        >
          <Activity className="h-4 w-4" />
          Audit Trail
        </button>
      </div>

      {/* TAB 1: GLOBAL FEATURES */}
      {activeTab === "global" && (
        <div className="space-y-6">
          <Card className="border-gray-200/70 dark:border-gray-800">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Platform-Wide Global Features</CardTitle>
                  <CardDescription>
                    Disabling a feature globally takes absolute priority. It immediately hides the module from all business sidebars and denies all direct route and API requests.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {features.map((feature) => (
                  <div
                    key={feature.key}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-base text-gray-900 dark:text-white">
                          {feature.name}
                        </span>
                        <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono text-gray-600 dark:text-gray-300">
                          {feature.key}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {feature.category}
                        </Badge>
                        {feature.globalEnabled ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Active Globally
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="font-semibold">
                            Globally Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                        <span>Route: <code className="text-gray-500">{feature.defaultRoute}</code></span>
                        <span>•</span>
                        <span>{feature.businessOverridesCount} business overrides</span>
                        <span>•</span>
                        <span>{feature.userOverridesCount} user overrides</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-medium text-gray-500">
                        {feature.globalEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={feature.globalEnabled}
                        onCheckedChange={(val) => handleToggleGlobal(feature.key, val)}
                        aria-label={`Toggle ${feature.name}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: BUSINESS OVERRIDES */}
      {activeTab === "business" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search & Business List */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-gray-200/70 dark:border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Find Restaurant Business</CardTitle>
                <CardDescription className="text-xs">
                  Search by business name, owner, email, phone, or ID
                </CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search businesses..."
                    value={businessSearch}
                    onChange={(e) => setBusinessSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2 max-h-[460px] overflow-y-auto space-y-1">
                {businesses.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No matching businesses found</p>
                ) : (
                  businesses.map((b) => {
                    const isSelected = selectedBusiness?.id === b.id;
                    const isBulkSelected = selectedBusinessesForBulk.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => selectBusiness(b)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-gray-900 bg-gray-50/80 dark:border-white dark:bg-gray-900"
                            : "border-transparent hover:bg-gray-100/60 dark:hover:bg-gray-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isBulkSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedBusinessesForBulk((prev) => [...prev, b.id]);
                                } else {
                                  setSelectedBusinessesForBulk((prev) => prev.filter((id) => id !== b.id));
                                }
                              }}
                              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {b.name}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {b.status}
                          </Badge>
                        </div>
                        <div className="mt-1 pl-5 text-gray-500 dark:text-gray-400 text-[11px] space-y-0.5">
                          <p>{b.ownerName || b.ownerEmail || "No owner contact"}</p>
                          <p>{b.overridesCount} overrides configured</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Bulk Action Panel */}
            {selectedBusinessesForBulk.length > 0 && (
              <Card className="border-gray-900 dark:border-white bg-gray-50/90 dark:bg-gray-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white">
                    Bulk Selected: {selectedBusinessesForBulk.length}
                  </span>
                  <button
                    onClick={() => setSelectedBusinessesForBulk([])}
                    className="text-[11px] text-gray-500 hover:text-gray-900 underline"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="space-y-2">
                  <select
                    value={bulkFeatureKey}
                    onChange={(e) => setBulkFeatureKey(e.target.value as FeatureKey)}
                    className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-950"
                  >
                    {Object.keys(FEATURE_CATALOG).map((k) => (
                      <option key={k} value={k}>{FEATURE_CATALOG[k as FeatureKey].name} ({k})</option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Set To:</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={bulkFeatureEnabled ? "default" : "outline"}
                        className="text-xs h-7 px-3"
                        onClick={() => setBulkFeatureEnabled(true)}
                      >
                        Enable
                      </Button>
                      <Button
                        size="sm"
                        variant={!bulkFeatureEnabled ? "destructive" : "outline"}
                        className="text-xs h-7 px-3"
                        onClick={() => setBulkFeatureEnabled(false)}
                      >
                        Disable
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs mt-2 bg-gray-900 text-white"
                    onClick={handleBulkApply}
                  >
                    Apply to {selectedBusinessesForBulk.length} Businesses
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Selected Business Overrides Matrix */}
          <div className="lg:col-span-8 space-y-4">
            {selectedBusiness ? (
              <Card className="border-gray-200/70 dark:border-gray-800">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <CardTitle className="text-lg">{selectedBusiness.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Owner: {selectedBusiness.ownerName || "N/A"} • Email: {selectedBusiness.ownerEmail || "N/A"} • ID: <code className="text-[10px]">{selectedBusiness.id}</code>
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {businessFeatures.filter((f) => f.hasOverride).length} Custom Overrides
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
                  {businessFeatures.map((feat) => {
                    const isGloballyDisabled = feat.effectiveStatus === "GLOBALLY_DISABLED";
                    return (
                      <div
                        key={feat.key}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {feat.name}
                            </span>
                            <code className="text-[11px] font-mono text-gray-400">{feat.key}</code>
                            {getEffectiveBadge(feat.effectiveStatus)}
                            {feat.hasOverride && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Business Override Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {feat.description}
                          </p>
                          {isGloballyDisabled && (
                            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                              <Lock className="h-3 w-3" />
                              Globally disabled: Business setting will not take effect until enabled globally.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {feat.hasOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetBusinessOverride(feat.key)}
                              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-900 gap-1"
                              title="Reset override back to default"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset
                            </Button>
                          )}
                          <Switch
                            checked={feat.hasOverride ? feat.overrideEnabled === true : feat.isEnabled}
                            onCheckedChange={(val) => handleToggleBusinessOverride(feat.key, val)}
                            disabled={isGloballyDisabled}
                            aria-label={`Toggle ${feat.name} for ${selectedBusiness.name}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-12 text-center text-gray-400 text-sm">
                Select a business from the left panel to inspect and customize its feature permissions.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER OVERRIDES */}
      {activeTab === "user" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: User Selection inside Business */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-gray-200/70 dark:border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Staff & User Directory</CardTitle>
                <CardDescription className="text-xs">
                  Select a user account inside {selectedBusiness?.name || "the business"} to restrict individual modules
                </CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Filter users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2 max-h-[460px] overflow-y-auto space-y-1">
                {users
                  .filter((u) =>
                    !userSearch ||
                    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => selectUser(u)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-gray-900 bg-gray-50/80 dark:border-white dark:bg-gray-900"
                            : "border-transparent hover:bg-gray-100/60 dark:hover:bg-gray-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {u.role}
                          </Badge>
                        </div>
                        <p className="text-gray-500 text-[11px] truncate">{u.email}</p>
                        {u.overridesCount > 0 && (
                          <span className="text-[10px] text-purple-600 font-medium">
                            {u.overridesCount} user overrides
                          </span>
                        )}
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: User Feature Matrix */}
          <div className="lg:col-span-8 space-y-4">
            {selectedUser ? (
              <Card className="border-gray-200/70 dark:border-gray-800">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Email: {selectedUser.email} • Role: {selectedUser.role} • Restaurant: {selectedUser.restaurantName || "General"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {userFeatures.filter((f) => f.hasOverride).length} Custom User Overrides
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
                  {userFeatures.map((feat) => {
                    const isGloballyDisabled = feat.effectiveStatus === "GLOBALLY_DISABLED";
                    const isBusinessDisabled = feat.effectiveStatus === "BUSINESS_DISABLED";
                    const isLockedByHigherTier = isGloballyDisabled || isBusinessDisabled;

                    return (
                      <div
                        key={feat.key}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {feat.name}
                            </span>
                            <code className="text-[11px] font-mono text-gray-400">{feat.key}</code>
                            {getEffectiveBadge(feat.effectiveStatus)}
                            {feat.hasOverride && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                User Override Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {feat.description}
                          </p>
                          {isLockedByHigherTier && (
                            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                              <Lock className="h-3 w-3" />
                              {isGloballyDisabled
                                ? "Disabled globally by Super Admin."
                                : "Disabled at the Business level."}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {feat.hasOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetUserOverride(feat.key)}
                              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-900 gap-1"
                              title="Reset user override back to default"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset
                            </Button>
                          )}
                          <Switch
                            checked={feat.hasOverride ? feat.overrideEnabled === true : feat.isEnabled}
                            onCheckedChange={(val) => handleToggleUserOverride(feat.key, val)}
                            disabled={isLockedByHigherTier}
                            aria-label={`Toggle ${feat.name} for ${selectedUser.name}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-12 text-center text-gray-400 text-sm">
                Select a user from the directory to view and configure user-level feature access.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === "audit" && (
        <Card className="border-gray-200/70 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Feature Flag Change History</CardTitle>
            <CardDescription>
              Chronological audit log of feature flag updates, overrides, and bulk actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {auditLogs.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400">No feature audit logs recorded yet</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.entity}
                        </Badge>
                        {log.entityId && (
                          <code className="font-mono text-gray-500">{log.entityId}</code>
                        )}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Triggered by: <span className="font-medium text-gray-700 dark:text-gray-300">{log.actorEmail || "Super Admin"}</span>
                      </p>
                    </div>
                    <div className="text-gray-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal for Global Disabling */}
      <Dialog open={!!confirmGlobalKey} onOpenChange={() => setConfirmGlobalKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg">
              Disable {confirmGlobalKey ? FEATURE_CATALOG[confirmGlobalKey]?.name : "Feature"} for Everyone?
            </DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm text-gray-500 pt-1">
              Disabling this feature globally will hide the module from <strong>every restaurant business and staff member</strong> immediately. Direct URL visits will be blocked and API operations will be denied.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmGlobalKey(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmGlobalKey && executeGlobalToggle(confirmGlobalKey, false)}
            >
              Yes, Disable for Everyone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
