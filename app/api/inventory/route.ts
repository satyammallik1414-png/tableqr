import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { inventorySchema } from "@/lib/validations";
import { requireFeatureAccess } from "@/lib/features";

export async function GET() {
  try {
    const session = await auth();
    const branchId = session?.user?.branchId;
    const restaurantId = session?.user?.restaurantId;

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID required" },
        { status: 400 },
      );
    }

    const guard = await requireFeatureAccess("INVENTORY", session?.user?.id, restaurantId);
    if (!guard.allowed) {
      return guard.response;
    }

    const inventory = await prisma.inventory.findMany({
      where: { branchId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: inventory });
  } catch (error) {
    console.error("Fetch inventory error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const branchId = session?.user?.branchId;
    const restaurantId = session?.user?.restaurantId;

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID required" },
        { status: 400 },
      );
    }

    const guard = await requireFeatureAccess("INVENTORY", session?.user?.id, restaurantId);
    if (!guard.allowed) {
      return guard.response;
    }

    const body = await request.json();
    const parsed = inventorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const item = await prisma.inventory.create({
      data: {
        branchId,
        ...parsed.data,
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create inventory item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create inventory item" },
      { status: 500 },
    );
  }
}
