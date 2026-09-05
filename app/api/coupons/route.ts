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

    const guard = await requireFeatureAccess("LOYALTY", session?.user?.id, restaurantId);
    if (!guard.allowed) return guard.response;

    const coupons = await prisma.coupon.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: coupons });
  } catch (error) {
    console.error("Fetch coupons error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch coupons" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const guard = await requireFeatureAccess("LOYALTY", session?.user?.id, restaurantId);
    if (!guard.allowed) return guard.response;

    const body = await request.json();
    const { code, discountType, discountValue, minOrder, maxUses, expiresAt } = body;

    const coupon = await prisma.coupon.create({
      data: {
        restaurantId,
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        minOrder: parseFloat(minOrder ?? 0),
        maxUses: parseInt(maxUses ?? 100),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
  } catch (error) {
    console.error("Create coupon error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create coupon" },
      { status: 500 },
    );
  }
}
