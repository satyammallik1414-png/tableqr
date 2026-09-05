import { prisma } from "@/lib/prisma";
import { FeatureKey } from "@prisma/client";
import { NextResponse } from "next/server";

export { FeatureKey };

export type EffectiveAccessStatus =
  | "ENABLED"
  | "GLOBALLY_DISABLED"
  | "BUSINESS_DISABLED"
  | "USER_DISABLED";

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  category: "Operations" | "Management" | "Growth" | "System";
  defaultRoute: string;
}

export const FEATURE_CATALOG: Record<FeatureKey, FeatureDefinition> = {
  MENU: {
    key: "MENU",
    name: "Menu Management",
    description: "Digital menu catalog, dishes, pricing, modifiers, and food categories.",
    category: "Operations",
    defaultRoute: "/admin/menu",
  },
  TABLES: {
    key: "TABLES",
    name: "Tables & Floor Plan",
    description: "Floor layout, dining tables, QR code generation, and table seating status.",
    category: "Operations",
    defaultRoute: "/admin/tables",
  },
  ORDERS: {
    key: "ORDERS",
    name: "Order Processing",
    description: "Live order tracking, kitchen tickets, status transitions, and order history.",
    category: "Operations",
    defaultRoute: "/admin/orders",
  },
  STAFF: {
    key: "STAFF",
    name: "Staff Management",
    description: "Team members, role assignments (Admin, Manager, Kitchen, Cashier), and staff records.",
    category: "Management",
    defaultRoute: "/admin/staff",
  },
  CUSTOMERS: {
    key: "CUSTOMERS",
    name: "Customer CRM",
    description: "Customer database, order frequency, loyalty history, and contact directory.",
    category: "Growth",
    defaultRoute: "/admin/customers",
  },
  INVENTORY: {
    key: "INVENTORY",
    name: "Inventory & Stock",
    description: "Ingredient stock levels, unit cost management, and low-stock alerts.",
    category: "Management",
    defaultRoute: "/admin/inventory",
  },
  ANALYTICS: {
    key: "ANALYTICS",
    name: "Analytics & Trends",
    description: "Revenue trends, peak hours, sales volume, and top-selling menu items.",
    category: "Growth",
    defaultRoute: "/admin/analytics",
  },
  BRANCHES: {
    key: "BRANCHES",
    name: "Multi-Branch Operations",
    description: "Manage multiple restaurant branches, locations, and branch managers.",
    category: "Management",
    defaultRoute: "/admin/branches",
  },
  LOYALTY: {
    key: "LOYALTY",
    name: "Loyalty & Coupons",
    description: "Discount promo codes, loyalty tiers (Bronze, Silver, Gold, Platinum), and rewards.",
    category: "Growth",
    defaultRoute: "/admin/loyalty",
  },
  REPORTS: {
    key: "REPORTS",
    name: "Financial Reports",
    description: "Tax reports (CGST/SGST), sales summaries, invoice audits, and Excel/PDF export.",
    category: "Management",
    defaultRoute: "/admin/reports",
  },
  SETTINGS: {
    key: "SETTINGS",
    name: "Business Settings",
    description: "Restaurant configuration, GST credentials, currency, timezone, and operational policies.",
    category: "System",
    defaultRoute: "/admin/settings",
  },
};

export const ALL_FEATURE_KEYS = Object.keys(FEATURE_CATALOG) as FeatureKey[];

/**
 * Ensures all 11 catalog features and their global settings exist in the database.
 */
export async function seedFeaturesIfMissing(): Promise<void> {
  for (const def of Object.values(FEATURE_CATALOG)) {
    await prisma.feature.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
      },
      update: {
        name: def.name,
        description: def.description,
        category: def.category,
      },
    });

    await prisma.globalFeatureSetting.upsert({
      where: { featureKey: def.key },
      create: {
        featureKey: def.key,
        enabled: true,
      },
      update: {},
    });
  }
}

export interface EffectiveFeatureResult {
  featureKey: FeatureKey;
  effectiveStatus: EffectiveAccessStatus;
  isEnabled: boolean;
  reason: string;
}

/**
 * Calculates effective access for a feature key following the priority waterfall:
 * 1. Global setting: if disabled, blocks everyone.
 * 2. Business override: if disabled, blocks that business.
 * 3. User override: if disabled, blocks that user.
 * 4. Default: enabled.
 */
export async function getEffectiveFeatureAccess(
  featureKey: FeatureKey,
  userId?: string | null,
  businessId?: string | null
): Promise<EffectiveFeatureResult> {
  // 1. Check Global Setting
  const globalSetting = await prisma.globalFeatureSetting.findUnique({
    where: { featureKey },
  });

  if (globalSetting && !globalSetting.enabled) {
    return {
      featureKey,
      effectiveStatus: "GLOBALLY_DISABLED",
      isEnabled: false,
      reason: `Feature '${FEATURE_CATALOG[featureKey]?.name || featureKey}' is disabled globally by the Super Administrator.`,
    };
  }

  // 2. Check Business Override (if businessId provided)
  if (businessId) {
    const businessOverride = await prisma.businessFeatureOverride.findUnique({
      where: {
        featureKey_businessId: {
          featureKey,
          businessId,
        },
      },
    });

    if (businessOverride && !businessOverride.enabled) {
      return {
        featureKey,
        effectiveStatus: "BUSINESS_DISABLED",
        isEnabled: false,
        reason: `Feature '${FEATURE_CATALOG[featureKey]?.name || featureKey}' is disabled for this restaurant business.`,
      };
    }
  }

  // 3. Check User Override (if userId provided)
  if (userId) {
    const userOverride = await prisma.userFeatureOverride.findUnique({
      where: {
        featureKey_userId: {
          featureKey,
          userId,
        },
      },
    });

    if (userOverride && !userOverride.enabled) {
      return {
        featureKey,
        effectiveStatus: "USER_DISABLED",
        isEnabled: false,
        reason: `Feature '${FEATURE_CATALOG[featureKey]?.name || featureKey}' is disabled for your specific user account.`,
      };
    }
  }

  return {
    featureKey,
    effectiveStatus: "ENABLED",
    isEnabled: true,
    reason: "Feature is active and available.",
  };
}

/**
 * Returns a boolean indicating whether the specified feature is accessible.
 */
export async function canAccessFeature(
  featureKey: FeatureKey,
  userId?: string | null,
  businessId?: string | null
): Promise<boolean> {
  const result = await getEffectiveFeatureAccess(featureKey, userId, businessId);
  return result.isEnabled;
}

/**
 * Returns an object mapping all 11 feature keys to their boolean access state.
 */
export async function getEffectiveFeaturesMap(
  userId?: string | null,
  businessId?: string | null
): Promise<Record<FeatureKey, boolean>> {
  // Fetch all global settings
  const globals = await prisma.globalFeatureSetting.findMany();
  const globalMap = new Map<FeatureKey, boolean>();
  for (const g of globals) {
    globalMap.set(g.featureKey, g.enabled);
  }

  // Fetch business overrides if businessId
  const businessMap = new Map<FeatureKey, boolean>();
  if (businessId) {
    const bOverrides = await prisma.businessFeatureOverride.findMany({
      where: { businessId },
    });
    for (const b of bOverrides) {
      businessMap.set(b.featureKey, b.enabled);
    }
  }

  // Fetch user overrides if userId
  const userMap = new Map<FeatureKey, boolean>();
  if (userId) {
    const uOverrides = await prisma.userFeatureOverride.findMany({
      where: { userId },
    });
    for (const u of uOverrides) {
      userMap.set(u.featureKey, u.enabled);
    }
  }

  const result = {} as Record<FeatureKey, boolean>;

  for (const key of ALL_FEATURE_KEYS) {
    // 1. Global check
    const isGloballyDisabled = globalMap.has(key) && !globalMap.get(key);
    if (isGloballyDisabled) {
      result[key] = false;
      continue;
    }

    // 2. Business check
    const isBusinessDisabled = businessMap.has(key) && !businessMap.get(key);
    if (isBusinessDisabled) {
      result[key] = false;
      continue;
    }

    // 3. User check
    const isUserDisabled = userMap.has(key) && !userMap.get(key);
    if (isUserDisabled) {
      result[key] = false;
      continue;
    }

    // Default to true
    result[key] = true;
  }

  return result;
}

/**
 * Route / API Guard: validates access and returns an error response if disabled.
 */
export async function requireFeatureAccess(
  featureKey: FeatureKey,
  userId?: string | null,
  businessId?: string | null
): Promise<{ allowed: true; result: EffectiveFeatureResult } | { allowed: false; response: NextResponse; result: EffectiveFeatureResult }> {
  const result = await getEffectiveFeatureAccess(featureKey, userId, businessId);
  if (!result.isEnabled) {
    return {
      allowed: false,
      result,
      response: NextResponse.json(
        {
          success: false,
          error: result.reason,
          effectiveStatus: result.effectiveStatus,
          featureKey,
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, result };
}
