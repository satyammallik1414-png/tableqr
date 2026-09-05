import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  FEATURE_CATALOG,
  FeatureKey,
  ALL_FEATURE_KEYS,
  getEffectiveFeatureAccess,
} from "@/lib/features";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const businessId = searchParams.get("businessId")?.trim();

    // 1. If businessId provided: return full feature access matrix for this business
    if (businessId) {
      const business = await prisma.restaurant.findUnique({
        where: { id: businessId },
        include: {
          featureOverrides: true,
          users: {
            select: { id: true, name: true, email: true, role: true },
            take: 20,
          },
        },
      });

      if (!business) {
        return NextResponse.json(
          { success: false, error: "Business not found" },
          { status: 404 }
        );
      }

      // Compute matrix for all 11 features
      const matrix = await Promise.all(
        ALL_FEATURE_KEYS.map(async (key) => {
          const def = FEATURE_CATALOG[key];
          const override = business.featureOverrides.find((o) => o.featureKey === key);
          const effective = await getEffectiveFeatureAccess(key, null, business.id);

          return {
            key,
            name: def.name,
            description: def.description,
            category: def.category,
            hasOverride: !!override,
            overrideEnabled: override ? override.enabled : null,
            overrideUpdatedAt: override?.updatedAt,
            overrideUpdatedBy: override?.updatedBy,
            effectiveStatus: effective.effectiveStatus,
            isEnabled: effective.isEnabled,
            reason: effective.reason,
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          business: {
            id: business.id,
            name: business.name,
            slug: business.slug,
            ownerName: business.ownerName,
            ownerEmail: business.ownerEmail,
            ownerPhone: business.ownerPhone,
            status: business.status,
            usersCount: business.users.length,
          },
          features: matrix,
        },
      });
    }

    // 2. Otherwise search / list businesses
    const whereClause: Record<string, unknown> = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { ownerName: { contains: query, mode: "insensitive" } },
        { ownerEmail: { contains: query, mode: "insensitive" } },
        { ownerPhone: { contains: query, mode: "insensitive" } },
        { id: { equals: query } },
      ];
    }

    const businesses = await prisma.restaurant.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        ownerName: true,
        ownerEmail: true,
        ownerPhone: true,
        status: true,
        _count: {
          select: {
            featureOverrides: true,
            users: true,
            branches: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        ownerName: b.ownerName,
        ownerEmail: b.ownerEmail,
        ownerPhone: b.ownerPhone,
        status: b.status,
        overridesCount: b._count.featureOverrides,
        usersCount: b._count.users,
        branchesCount: b._count.branches,
      })),
    });
  } catch (error) {
    console.error("Error fetching business feature settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business feature data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const body = await req.json();
    const { businessId, featureKey, enabled } = body;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "businessId is required" },
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

    const override = await prisma.businessFeatureOverride.upsert({
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
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: authCheck.session?.user?.id,
        actorEmail,
        actorRole: "SUPERADMIN",
        action: `BUSINESS_FEATURE_${enabled ? "ENABLED" : "DISABLED"}`,
        entity: "BUSINESS_FEATURE",
        entityId: featureKey,
        restaurantId: businessId,
        metadata: {
          featureKey,
          businessId,
          newState: enabled,
        },
      },
    });

    const effective = await getEffectiveFeatureAccess(featureKey as FeatureKey, null, businessId);

    // Revalidate affected routes
    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/(admin)", "layout");
      revalidatePath("/api/features/effective");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Feature ${featureKey} set to ${enabled ? "enabled" : "disabled"} for this business.`,
      data: {
        override,
        effective,
      },
    });
  } catch (error) {
    console.error("Error updating business feature override:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update business feature override" },
      { status: 500 }
    );
  }
}

// Reset business override back to default (delete override)
export async function DELETE(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId")?.trim();
    const featureKey = searchParams.get("featureKey")?.trim();

    if (!businessId || !featureKey) {
      return NextResponse.json(
        { success: false, error: "Both businessId and featureKey are required" },
        { status: 400 }
      );
    }

    await prisma.businessFeatureOverride.deleteMany({
      where: {
        businessId,
        featureKey: featureKey as FeatureKey,
      },
    });

    const actorEmail = authCheck.session?.user?.email || "Super Admin";

    await prisma.auditLog.create({
      data: {
        actorId: authCheck.session?.user?.id,
        actorEmail,
        actorRole: "SUPERADMIN",
        action: "BUSINESS_FEATURE_RESET_TO_DEFAULT",
        entity: "BUSINESS_FEATURE",
        entityId: featureKey,
        restaurantId: businessId,
        metadata: {
          featureKey,
          businessId,
          scope: "BUSINESS_OVERRIDE_RESET",
        },
      },
    });

    const effective = await getEffectiveFeatureAccess(featureKey as FeatureKey, null, businessId);

    // Revalidate affected routes
    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/(admin)", "layout");
      revalidatePath("/api/features/effective");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Feature ${featureKey} override reset to default.`,
      data: { effective },
    });
  } catch (error) {
    console.error("Error resetting business feature override:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset business feature override" },
      { status: 500 }
    );
  }
}
