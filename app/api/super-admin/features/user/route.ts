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
    const businessId = searchParams.get("businessId")?.trim();
    const userId = searchParams.get("userId")?.trim();
    const query = searchParams.get("q")?.trim();

    // 1. If specific userId: return full matrix of 11 features for this user
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          featureOverrides: true,
          restaurant: { select: { id: true, name: true } },
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      const matrix = await Promise.all(
        ALL_FEATURE_KEYS.map(async (key) => {
          const def = FEATURE_CATALOG[key];
          const override = user.featureOverrides.find((o) => o.featureKey === key);
          const effective = await getEffectiveFeatureAccess(key, user.id, user.restaurantId);

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
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            restaurantId: user.restaurantId,
            restaurantName: user.restaurant?.name,
          },
          features: matrix,
        },
      });
    }

    // 2. Otherwise list users (filtered by businessId if provided, plus text search)
    const whereClause: Record<string, unknown> = {};
    if (businessId) {
      whereClause.restaurantId = businessId;
    }
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { id: { equals: query } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        restaurantId: true,
        restaurant: { select: { id: true, name: true } },
        _count: {
          select: {
            featureOverrides: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        restaurantId: u.restaurantId,
        restaurantName: u.restaurant?.name,
        overridesCount: u._count.featureOverrides,
      })),
    });
  } catch (error) {
    console.error("Error fetching user feature settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user feature data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const body = await req.json();
    const { userId, featureKey, enabled } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, restaurantId: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const actorEmail = authCheck.session?.user?.email || "Super Admin";

    const override = await prisma.userFeatureOverride.upsert({
      where: {
        featureKey_userId: {
          featureKey: featureKey as FeatureKey,
          userId,
        },
      },
      create: {
        featureKey: featureKey as FeatureKey,
        userId,
        businessId: user.restaurantId,
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
        action: `USER_FEATURE_${enabled ? "ENABLED" : "DISABLED"}`,
        entity: "USER_FEATURE",
        entityId: featureKey,
        restaurantId: user.restaurantId,
        metadata: {
          featureKey,
          userId,
          userEmail: user.email,
          newState: enabled,
        },
      },
    });

    const effective = await getEffectiveFeatureAccess(
      featureKey as FeatureKey,
      userId,
      user.restaurantId
    );

    // Revalidate affected routes
    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/(admin)", "layout");
      revalidatePath("/api/features/effective");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Feature ${featureKey} set to ${enabled ? "enabled" : "disabled"} for this user.`,
      data: {
        override,
        effective,
      },
    });
  } catch (error) {
    console.error("Error updating user feature override:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user feature override" },
      { status: 500 }
    );
  }
}

// Reset user override back to default
export async function DELETE(req: Request) {
  const authCheck = await requireSuperAdmin();
  if (authCheck.errorResponse) return authCheck.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId")?.trim();
    const featureKey = searchParams.get("featureKey")?.trim();

    if (!userId || !featureKey) {
      return NextResponse.json(
        { success: false, error: "Both userId and featureKey are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, restaurantId: true, email: true },
    });

    await prisma.userFeatureOverride.deleteMany({
      where: {
        userId,
        featureKey: featureKey as FeatureKey,
      },
    });

    const actorEmail = authCheck.session?.user?.email || "Super Admin";

    await prisma.auditLog.create({
      data: {
        actorId: authCheck.session?.user?.id,
        actorEmail,
        actorRole: "SUPERADMIN",
        action: "USER_FEATURE_RESET_TO_DEFAULT",
        entity: "USER_FEATURE",
        entityId: featureKey,
        restaurantId: user?.restaurantId,
        metadata: {
          featureKey,
          userId,
          userEmail: user?.email,
          scope: "USER_OVERRIDE_RESET",
        },
      },
    });

    const effective = await getEffectiveFeatureAccess(
      featureKey as FeatureKey,
      userId,
      user?.restaurantId
    );

    // Revalidate affected routes
    try {
      revalidatePath("/admin", "layout");
      revalidatePath("/(admin)", "layout");
      revalidatePath("/api/features/effective");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Feature ${featureKey} override reset to default for this user.`,
      data: { effective },
    });
  } catch (error) {
    console.error("Error resetting user feature override:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset user feature override" },
      { status: 500 }
    );
  }
}
