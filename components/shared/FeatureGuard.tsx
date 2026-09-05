"use client";

import { useEffect } from "react";
import { FeatureKey } from "@/lib/features";
import { AccessDisabled } from "./AccessDisabled";
import { usePermissionStore } from "@/store/permissionStore";

interface FeatureGuardProps {
  featureKey: FeatureKey;
  children: React.ReactNode;
}

export function FeatureGuard({ featureKey, children }: FeatureGuardProps) {
  const isInitialized = usePermissionStore((state) => state.isInitialized);
  const isLoading = usePermissionStore((state) => state.isLoading);
  const featuresMap = usePermissionStore((state) => state.featuresMap);

  useEffect(() => {
    if (!isInitialized) {
      usePermissionStore.getState().fetchEffectiveFeatures();
    }
  }, [isInitialized]);

  // Fail-closed: show skeleton while permissions are loading; never show protected children temporarily
  if (!isInitialized || (isLoading && !featuresMap)) {
    return (
      <div className="space-y-6 p-4 max-w-7xl mx-auto">
        <div className="h-8 w-64 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800/60" />
        <div className="h-12 w-full rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800/60" />
        <div className="h-64 w-full rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800/60" />
      </div>
    );
  }

  // Fail closed: require explicit true from the resolved permission state
  const isAllowed = featuresMap?.[featureKey] === true;

  if (!isAllowed) {
    return (
      <AccessDisabled
        featureKey={featureKey}
        effectiveStatus="RESTRICTED"
      />
    );
  }

  return <>{children}</>;
}
