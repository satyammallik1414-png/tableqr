import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/features";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("MENU", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const tableId = searchParams.get("tableId");

    let targetBranchId = branchId;

    if (tableId && !branchId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: { branchId: true },
      });
      if (table) targetBranchId = table.branchId;
    }

    if (!targetBranchId) {
      if (session?.user?.branchId) {
        targetBranchId = session.user.branchId;
      } else if (session?.user?.restaurantId) {
        const restBranch = await prisma.branch.findFirst({
          where: { restaurantId: session.user.restaurantId, isActive: true },
          select: { id: true },
        });
        targetBranchId = restBranch?.id ?? null;
      } else {
        const firstActive = await prisma.branch.findFirst({
          where: { isActive: true },
          select: { id: true },
        });
        targetBranchId = firstActive?.id ?? null;
      }
    }

    // If an authenticated restaurant user requests a branch, ensure it belongs to their restaurant
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
      return NextResponse.json(
        { success: false, error: "No branch found" },
        { status: 404 },
      );
    }

    let [categories, items] = await Promise.all([
      prisma.category.findMany({
        where: { branchId: targetBranchId, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.menuItem.findMany({
        where: {
          category: { branchId: targetBranchId, isActive: true },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    if (categories.length === 0) {
      const defaultCategories = [
        { name: "Starters & Appetizers", sortOrder: 1 },
        { name: "Main Course", sortOrder: 2 },
        { name: "Fast Food & Snacks", sortOrder: 3 },
        { name: "Beverages & Drinks", sortOrder: 4 },
        { name: "Desserts & Sweets", sortOrder: 5 },
        { name: "Breads & Rice", sortOrder: 6 },
      ];

      await prisma.category.createMany({
        data: defaultCategories.map((cat) => ({
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

    return NextResponse.json({
      success: true,
      data: { categories, items },
    });
  } catch (error) {
    console.error("Fetch menu error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch menu" },
      { status: 500 },
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
    const { name, categoryId, price, description, image, preparationTime, isVeg, isAvailable, isFeatured, isTrending, isRecommended, variants, addons } = body;

    const item = await prisma.menuItem.create({
      data: {
        name,
        categoryId,
        price: parseFloat(price),
        description: description || null,
        image: image || null,
        preparationTime: preparationTime ? parseInt(preparationTime) : null,
        isVeg: isVeg ?? true,
        isAvailable: isAvailable ?? true,
        isFeatured: isFeatured ?? false,
        isTrending: isTrending ?? false,
        isRecommended: isRecommended ?? false,
        variants: variants ?? [],
        addons: addons ?? [],
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create menu item" },
      { status: 500 },
    );
  }
}
