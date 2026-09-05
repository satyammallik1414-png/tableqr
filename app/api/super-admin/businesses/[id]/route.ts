import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const business = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            manager: { select: { id: true, name: true, email: true } },
            _count: { select: { tables: true, orders: true } },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            branch: { select: { name: true } },
          },
        },
        customers: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            branches: true,
            users: true,
            customers: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: "Business not found." },
        { status: 404 }
      );
    }

    // Aggregate total revenue & orders count across all branches
    const totalOrders = await prisma.order.count({
      where: { branch: { restaurantId: id } },
    });

    const revenueResult = await prisma.order.aggregate({
      where: { branch: { restaurantId: id }, status: "SERVED" },
      _sum: { total: true },
    });

    const totalRevenue = revenueResult._sum.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        ...business,
        totalOrders,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Fetch Business Details Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Business not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        ownerName: body.ownerName ?? existing.ownerName,
        ownerEmail: body.ownerEmail ?? existing.ownerEmail,
        ownerPhone: body.ownerPhone ?? existing.ownerPhone,
        address: body.address ?? existing.address,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        status: body.status ?? existing.status,
        maxBranches: body.maxBranches !== undefined ? body.maxBranches : existing.maxBranches,
        maxStaff: body.maxStaff !== undefined ? body.maxStaff : existing.maxStaff,
        maxCustomers: body.maxCustomers !== undefined ? body.maxCustomers : existing.maxCustomers,
        maxOrders: body.maxOrders !== undefined ? body.maxOrders : existing.maxOrders,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: body.status && body.status !== existing.status ? `BUSINESS_${body.status}` : "UPDATE_BUSINESS",
      entity: "Restaurant",
      entityId: id,
      restaurantId: id,
      metadata: { previousStatus: existing.status, newStatus: updated.status, changes: body },
    });

    return NextResponse.json({
      success: true,
      message: "Business updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Update Business Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update business." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const existing = await prisma.restaurant.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Business not found." },
        { status: 404 }
      );
    }

    // Perform deletion
    await prisma.restaurant.delete({ where: { id } });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "DELETE_BUSINESS",
      entity: "Restaurant",
      entityId: id,
      metadata: { deletedBusinessName: existing.name },
    });

    return NextResponse.json({
      success: true,
      message: "Business and related data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Business Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete business." },
      { status: 500 }
    );
  }
}
