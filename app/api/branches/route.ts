import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/features";

export async function GET() {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const guard = await requireFeatureAccess("BRANCHES", session?.user?.id, restaurantId);
    if (!guard.allowed) {
      return guard.response;
    }

    const branches = await prisma.branch.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: branches });
  } catch (error) {
    console.error("Fetch branches error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch branches" },
      { status: 500 },
    );
  }
}
