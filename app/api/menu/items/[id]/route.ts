import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidateBranchQRCodes } from "@/lib/qr-data";
import { requireFeatureAccess } from "@/lib/features";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.restaurantId) {
      const guard = await requireFeatureAccess("MENU", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: { include: { branch: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Menu item not found" }, { status: 404 });
    }

    const role = (session.user.role ?? "").toUpperCase();
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes(role);
    if (!isSuperAdmin && session.user.restaurantId && existing.category.branch.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ success: false, error: "Forbidden. Item does not belong to your restaurant." }, { status: 403 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...body,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        preparationTime: body.preparationTime !== undefined ? parseInt(body.preparationTime) : undefined,
      },
    });

    // Invalidate QR menu caches for this branch
    await revalidateBranchQRCodes(existing.category.branchId);

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Update menu item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update menu item" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.restaurantId) {
      const guard = await requireFeatureAccess("MENU", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const { id } = await params;

    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: { include: { branch: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Menu item not found" }, { status: 404 });
    }

    const role = (session.user.role ?? "").toUpperCase();
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes(role);
    if (!isSuperAdmin && session.user.restaurantId && existing.category.branch.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ success: false, error: "Forbidden. Item does not belong to your restaurant." }, { status: 403 });
    }

    await prisma.menuItem.delete({ where: { id } });

    // Invalidate QR menu caches for this branch
    await revalidateBranchQRCodes(existing.category.branchId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete menu item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete menu item" },
      { status: 500 },
    );
  }
}

