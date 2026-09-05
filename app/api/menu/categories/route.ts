import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/features";

const DEFAULT_CATEGORIES = [
  { name: "Starters & Appetizers", sortOrder: 1 },
  { name: "Main Course", sortOrder: 2 },
  { name: "Fast Food & Snacks", sortOrder: 3 },
  { name: "Beverages & Drinks", sortOrder: 4 },
  { name: "Desserts & Sweets", sortOrder: 5 },
  { name: "Breads & Rice", sortOrder: 6 },
];

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || session?.user?.branchId;

    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("MENU", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    let targetBranchId = branchId;
    if (!targetBranchId && session?.user?.restaurantId) {
      const restBranch = await prisma.branch.findFirst({
        where: { restaurantId: session.user.restaurantId, isActive: true },
        select: { id: true },
      });
      targetBranchId = restBranch?.id ?? null;
    }

    if (!targetBranchId) {
      const firstBranch = await prisma.branch.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      targetBranchId = firstBranch?.id ?? null;
    }

    const role = (session?.user?.role ?? "").toUpperCase();
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes(role);
    if (targetBranchId && session?.user?.restaurantId && !isSuperAdmin) {
      const branchCheck = await prisma.branch.findFirst({
        where: { id: targetBranchId, restaurantId: session.user.restaurantId },
        select: { id: true },
      });
      if (!branchCheck) {
        const fallback = await prisma.branch.findFirst({
          where: { restaurantId: session.user.restaurantId, isActive: true },
          select: { id: true },
        });
        targetBranchId = fallback?.id ?? null;
      }
    }

    if (!targetBranchId) {
      return NextResponse.json({ success: true, data: [] });
    }

    let categories = await prisma.category.findMany({
      where: { branchId: targetBranchId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Auto-seed default categories if branch has none
    if (categories.length === 0) {
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          ...cat,
          branchId: targetBranchId,
          isActive: true,
        })),
      });

      categories = await prisma.category.findMany({
        where: { branchId: targetBranchId, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    }

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("MENU", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const body = await request.json();
    const { name, branchId } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
        { status: 400 }
      );
    }

    let targetBranchId = branchId || session?.user?.branchId;
    if (!targetBranchId && session?.user?.restaurantId) {
      const restBranch = await prisma.branch.findFirst({
        where: { restaurantId: session.user.restaurantId, isActive: true },
        select: { id: true },
      });
      targetBranchId = restBranch?.id ?? null;
    }

    const role = (session?.user?.role ?? "").toUpperCase();
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes(role);
    if (targetBranchId && session?.user?.restaurantId && !isSuperAdmin) {
      const branchCheck = await prisma.branch.findFirst({
        where: { id: targetBranchId, restaurantId: session.user.restaurantId },
        select: { id: true },
      });
      if (!branchCheck) {
        return NextResponse.json(
          { success: false, error: "Forbidden. Branch does not belong to your restaurant." },
          { status: 403 }
        );
      }
    }

    if (!targetBranchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID required" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        branchId: targetBranchId,
        isActive: true,
      },
    });

    const { revalidateBranchQRCodes } = await import("@/lib/qr-data");
    await revalidateBranchQRCodes(targetBranchId);

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}
