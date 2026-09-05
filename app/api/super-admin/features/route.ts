import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { FEATURE_CATALOG, FeatureKey, ALL_FEATURE_KEYS } from "@/lib/features";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const features = await prisma.feature.findMany({
      include: {
        globalSetting: true,
        businessOverrides: true,
        userOverrides: true,
      },
      orderBy: { key: "asc" },
    });

    const businessesCount = await prisma.restaurant.count();

    // Map features with metadata
    const featureList = features.map((f) => {
      const def = FEATURE_CATALOG[f.key as FeatureKey];
      return {
        key: f.key,
        name: f.name || def?.name || f.key,
        description: f.description || def?.description || "",
        category: f.category || def?.category || "Operations",
        defaultRoute: def?.defaultRoute || "/admin",
        globalEnabled: f.globalSetting?.enabled ?? true,
        globalUpdatedAt: f.globalSetting?.updatedAt,
        globalUpdatedBy: f.globalSetting?.updatedBy,
        businessOverridesCount: f.businessOverrides.length,
        userOverridesCount: f.userOverrides.length,
      };
    });

    // Recent feature audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: { in: ["GLOBAL_FEATURE", "BUSINESS_FEATURE", "USER_FEATURE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      data: {
        features: featureList,
        businessesCount,
        auditLogs,
      },
    });
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const body = await req.json();
    const { featureKey, enabled } = body;

    if (!featureKey || !ALL_FEATURE_KEYS.includes(featureKey as FeatureKey)) {
      return NextResponse.json(
        { success: false, error: "Invalid feature key" },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "'enabled' boolean is required" },
        { status: 400 }
      );
    }

    const previousSetting = await prisma.globalFeatureSetting.findUnique({
      where: { featureKey: featureKey as FeatureKey },
    });

    const updated = await prisma.globalFeatureSetting.upsert({
      where: { featureKey: featureKey as FeatureKey },
      create: {
        featureKey: featureKey as FeatureKey,
        enabled,
        updatedBy: authCheck.session?.user?.email || "Super Admin",
      },
      update: {
        enabled,
        updatedBy: authCheck.session?.user?.email || "Super Admin",
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: authCheck.session?.user?.id,
        actorEmail: authCheck.session?.user?.email,
        actorRole: "SUPERADMIN",
        action: enabled ? "GLOBAL_FEATURE_ENABLED" : "GLOBAL_FEATURE_DISABLED",
        entity: "GLOBAL_FEATURE",
        entityId: featureKey,
        metadata: {
          featureKey,
          previousState: previousSetting?.enabled ?? true,
          newState: enabled,
          scope: "GLOBAL",
        },
      },
    });

    // Revalidate affected routes and layouts
    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/(admin)", "layout");
      revalidatePath("/api/features/effective");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Global feature ${featureKey} has been ${enabled ? "enabled" : "disabled"}.`,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating global feature setting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update global feature setting" },
      { status: 500 }
    );
  }
}

// Bulk apply feature changes to multiple businesses
export async function PATCH(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const body = await req.json();
    const { businessIds, featureKey, enabled } = body;

    if (!Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "businessIds array must not be empty" },
        { status: 400 }
      );
    }

    if (!featureKey || !ALL_FEATURE_KEYS.includes(featureKey as FeatureKey)) {
      return NextResponse.json(
        { success: false, error: "Invalid feature key" },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "'enabled' boolean is required" },
        { status: 400 }
      );
    }

    const actorEmail = authCheck.session?.user?.email || "Super Admin";

    // Upsert overrides for each business in transaction
    await prisma.$transaction(
      businessIds.map((businessId: string) =>
        prisma.businessFeatureOverride.upsert({
          where: {
            featureKey_businessId: {
              featureKey: featureKey as FeatureKey,
              businessId,
            },
          },
          create: {
            featureKey: featureKey as FeatureKey,
            businessId,
            enabled,
            updatedBy: actorEmail,
          },
          update: {
            enabled,
            updatedBy: actorEmail,
          },
        })
      )
    );

    // Audit log for bulk action
    await prisma.auditLog.create({
      data: {
        actorId: authCheck.session?.user?.id,
        actorEmail,
        actorRole: "SUPERADMIN",
        action: `BULK_BUSINESS_FEATURE_${enabled ? "ENABLED" : "DISABLED"}`,
        entity: "BUSINESS_FEATURE",
        entityId: featureKey,
        metadata: {
          featureKey,
          targetBusinessesCount: businessIds.length,
          businessIds,
          newState: enabled,
        },
      },
    });

    // Revalidate affected routes and layouts
    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/(admin)", "layout");
      revalidatePath("/api/features/effective");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Updated ${featureKey} for ${businessIds.length} businesses.`,
    });
  } catch (error) {
    console.error("Error applying bulk feature changes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to apply bulk feature changes" },
      { status: 500 }
    );
  }
}
