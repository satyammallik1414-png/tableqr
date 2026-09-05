import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/features";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const branchId = searchParams.get("branchId") || session?.user?.branchId;

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (branchId) where.category = { branchId };

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("Fetch menu items error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch menu items" },
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
    const {
      name,
      categoryId,
      price,
      description,
      image,
      preparationTime,
      isVeg,
      isAvailable,
      isFeatured,
      isTrending,
      isRecommended,
      variants,
      addons,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Item name is required" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category is required" },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || isNaN(parseFloat(price))) {
      return NextResponse.json(
        { success: false, error: "Valid price is required" },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { branch: true },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const role = (session?.user?.role ?? "").toUpperCase();
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes(role);
    let finalCategoryId = category.id;
    let finalBranchId = category.branchId;

    if (!isSuperAdmin && session?.user?.restaurantId && category.branch.restaurantId !== session.user.restaurantId) {
      // Find the user's own active branch
      let userBranch = session?.user?.branchId
        ? await prisma.branch.findFirst({
            where: { id: session.user.branchId, restaurantId: session.user.restaurantId, isActive: true },
          })
        : null;

      if (!userBranch) {
        userBranch = await prisma.branch.findFirst({
          where: { restaurantId: session.user.restaurantId, isActive: true },
        });
      }

      if (userBranch) {
        let matchingCat = await prisma.category.findFirst({
          where: { branchId: userBranch.id, name: category.name, isActive: true },
        });
        if (!matchingCat) {
          matchingCat = await prisma.category.create({
            data: {
              name: category.name,
              branchId: userBranch.id,
              isActive: true,
            },
          });
        }
        finalCategoryId = matchingCat.id;
        finalBranchId = userBranch.id;
      } else {
        return NextResponse.json(
          { success: false, error: "Forbidden. Category does not belong to your restaurant." },
          { status: 403 }
        );
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        categoryId: finalCategoryId,
        price: parseFloat(price),
        description: description?.trim() || null,
        image: image?.trim() || null,
        preparationTime: preparationTime ? parseInt(preparationTime) : 10,
        isVeg: isVeg ?? true,
        isAvailable: isAvailable ?? true,
        isFeatured: isFeatured ?? false,
        isTrending: isTrending ?? false,
        isRecommended: isRecommended ?? false,
        variants: variants ?? [],
        addons: addons ?? [],
      },
    });

    // Invalidate QR menu caches for this branch
    const { revalidateBranchQRCodes } = await import("@/lib/qr-data");
    await revalidateBranchQRCodes(finalBranchId);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create menu item" },
      { status: 500 }
    );
  }
}
