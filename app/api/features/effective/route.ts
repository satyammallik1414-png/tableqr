import { auth } from "@/lib/auth";
import { getEffectiveFeaturesMap, ALL_FEATURE_KEYS } from "@/lib/features";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "CDN-Cache-Control": "no-store",
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      // If unauthenticated, all features default based on global settings
      const map = await getEffectiveFeaturesMap();
      return NextResponse.json(
        { success: true, data: map, timestamp: Date.now() },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const role = (session.user.role ?? "").toUpperCase();
    if (role === "SUPERADMIN" || role === "SUPER_ADMIN") {
      // Super Admin has full unrestricted access to everything
      const fullAccess = {} as Record<string, boolean>;
      for (const key of ALL_FEATURE_KEYS) {
        fullAccess[key] = true;
      }
      return NextResponse.json(
        { success: true, data: fullAccess, isSuperAdmin: true, timestamp: Date.now() },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const userId = session.user.id;
    const businessId = session.user.restaurantId;

    const map = await getEffectiveFeaturesMap(userId, businessId);
    return NextResponse.json(
      { success: true, data: map, userId, businessId, timestamp: Date.now() },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error retrieving effective features:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve effective features" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
