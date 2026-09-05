"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURE_CATALOG, FeatureKey } from "@/lib/features";

interface AccessDisabledProps {
  featureKey?: string | null;
  reason?: string | null;
  effectiveStatus?: string | null;
}

export function AccessDisabled({
  featureKey,
  reason,
  effectiveStatus,
}: AccessDisabledProps) {
  const key = (featureKey ?? "FEATURE").toUpperCase() as FeatureKey;
  const def = FEATURE_CATALOG[key];
  const featureName = def?.name || featureKey || "Module";

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case "GLOBALLY_DISABLED":
        return <Badge variant="destructive" className="px-3 py-1 font-semibold">Globally Disabled</Badge>;
      case "BUSINESS_DISABLED":
        return <Badge variant="destructive" className="px-3 py-1 font-semibold">Business Disabled</Badge>;
      case "USER_DISABLED":
        return <Badge variant="destructive" className="px-3 py-1 font-semibold">User Account Restricted</Badge>;
      default:
        return <Badge variant="destructive" className="px-3 py-1 font-semibold">Access Disabled</Badge>;
    }
  };

  const defaultExplanation = () => {
    switch (effectiveStatus) {
      case "GLOBALLY_DISABLED":
        return "This module is temporarily disabled platform-wide by the Super Administrator for maintenance or configuration.";
      case "BUSINESS_DISABLED":
        return "This module is not active on your restaurant's subscription or has been disabled by management.";
      case "USER_DISABLED":
        return "Your individual staff user account does not have permission to access this module.";
      default:
        return reason || "This module has been restricted. Please contact your restaurant administrator or platform support for access.";
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="max-w-xl w-full border-gray-200/80 dark:border-gray-800 shadow-lg text-center overflow-hidden">
        <div className="h-2 bg-red-500 w-full" />
        <CardContent className="p-8 sm:p-10 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              {getStatusBadge()}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {featureName} is Restricted
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              {reason || defaultExplanation()}
            </p>
          </div>

          {def?.description && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 text-left flex items-start gap-2.5">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Feature Key: {key}
                </span>
                <p className="mt-0.5">{def.description}</p>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950">
              <Link href="/admin/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2">
              <Link href="/admin/settings">
                <HelpCircle className="h-4 w-4" />
                Review Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
