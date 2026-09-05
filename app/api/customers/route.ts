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

    const guard = await requireFeatureAccess("CUSTOMERS", session?.user?.id, restaurantId);
    if (!guard.allowed) return guard.response;

    const customers = await prisma.customer.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error("Fetch customers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
