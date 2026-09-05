import { create } from "zustand";
import type { FeatureKey } from "@/lib/features";

export interface PermissionBroadcastMessage {
  type: "FEATURE_PERMISSION_CHANGED" | "FEATURES_REFETCH_REQUESTED";
  featureKey?: FeatureKey;
  enabled?: boolean;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = "smartserve_feature_permissions";
const LOCAL_STORAGE_SYNC_KEY = "smartserve_feature_sync";

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!broadcastChannel && "BroadcastChannel" in window) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

interface PermissionState {
  featuresMap: Record<string, boolean> | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface PermissionActions {
  setInitialFeatures: (features: Record<string, boolean>) => void;
  setFeaturesMap: (features: Record<string, boolean>) => void;
  setFeature: (key: string, enabled: boolean) => void;
  fetchEffectiveFeatures: () => Promise<Record<string, boolean> | null>;
  broadcastChange: (featureKey?: string, enabled?: boolean) => void;
  initSyncListener: () => () => void;
}

export type PermissionStore = PermissionState & PermissionActions;

export const usePermissionStore = create<PermissionStore>()((set, get) => ({
  featuresMap: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setInitialFeatures: (features) => {
    set({
      featuresMap: features,
      isInitialized: true,
      isLoading: false,
      error: null,
    });
  },

  setFeaturesMap: (features) => {
    set({
      featuresMap: features,
      isInitialized: true,
      isLoading: false,
      error: null,
    });
  },

  setFeature: (key, enabled) => {
    const current = get().featuresMap || {};
    set({
      featuresMap: {
        ...current,
        [key]: enabled,
      },
    });
  },

  fetchEffectiveFeatures: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/features/effective?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      const json = await res.json();
      if (json.success && json.data) {
        set({
          featuresMap: json.data,
          isInitialized: true,
          isLoading: false,
          error: null,
        });
        return json.data;
      } else {
        set({
          isLoading: false,
          error: json.error || "Failed to resolve effective features",
        });
        return null;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || "Network error fetching permissions",
      });
      return null;
    }
  },

  broadcastChange: (featureKey, enabled) => {
    const message: PermissionBroadcastMessage = {
      type: "FEATURE_PERMISSION_CHANGED",
      featureKey: featureKey as FeatureKey | undefined,
      enabled,
      timestamp: Date.now(),
    };

    // 1. BroadcastChannel (primary for modern browsers)
    const channel = getBroadcastChannel();
    if (channel) {
      try {
        channel.postMessage(message);
      } catch {}
    }

    // 2. localStorage event (fallback across tabs)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_SYNC_KEY, JSON.stringify(message));
      } catch {}
    }
  },

  initSyncListener: () => {
    if (typeof window === "undefined") return () => {};

    const handleMessage = (msg: PermissionBroadcastMessage) => {
      if (msg.type === "FEATURE_PERMISSION_CHANGED") {
        if (msg.featureKey && typeof msg.enabled === "boolean") {
          get().setFeature(msg.featureKey, msg.enabled);
        }
        // Always refresh from server to ensure exact waterfall consistency
        get().fetchEffectiveFeatures();
      }
    };

    // Listen on BroadcastChannel
    const channel = getBroadcastChannel();
    const bcListener = (event: MessageEvent) => {
      if (event.data) {
        handleMessage(event.data);
      }
    };

    if (channel) {
      channel.addEventListener("message", bcListener);
    }

    // Listen on window storage events
    const storageListener = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_SYNC_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          handleMessage(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", storageListener);

    // Cleanup
    return () => {
      if (channel) {
        channel.removeEventListener("message", bcListener);
      }
      window.removeEventListener("storage", storageListener);
    };
  },
}));
