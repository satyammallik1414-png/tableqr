"use client";

import { useEffect, useRef } from "react";
import { usePermissionStore } from "@/store/permissionStore";

interface PermissionProviderProps {
  initialFeatures?: Record<string, boolean> | null;
  children: React.ReactNode;
}

export function PermissionProvider({
  initialFeatures,
  children,
}: PermissionProviderProps) {
  const isHydrated = useRef(false);

  // Synchronous hydration during initial render if server data available
  if (!isHydrated.current && initialFeatures) {
    usePermissionStore.getState().setInitialFeatures(initialFeatures);
    isHydrated.current = true;
  }

  useEffect(() => {
    // 1. If server did not pass initial features, fetch immediately
    if (!usePermissionStore.getState().isInitialized) {
      usePermissionStore.getState().fetchEffectiveFeatures();
    }

    // 2. Start cross-tab BroadcastChannel and storage listeners
    const cleanup = usePermissionStore.getState().initSyncListener();

    // 3. Re-verify permissions whenever tab regains focus or visibility changes
    const onFocus = () => {
      usePermissionStore.getState().fetchEffectiveFeatures();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        onFocus();
      }
    });

    return () => {
      cleanup();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <>{children}</>;
}
