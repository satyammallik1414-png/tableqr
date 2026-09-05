import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/features";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const session = await auth();

    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("TABLES", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    else if (session?.user?.branchId) where.branchId = session.user.branchId;

    const tables = await prisma.table.findMany({
      where,
      orderBy: { tableNumber: "asc" },
    });

    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error("Fetch tables error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tables" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID required" },
        { status: 400 },
      );
    }

    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("TABLES", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const body = await request.json();
    const { tableNumber, capacity } = body;

    const table = await prisma.table.create({
      data: {
        branchId: session.user.branchId,
        tableNumber: parseInt(tableNumber),
        capacity: parseInt(capacity ?? 4),
      },
    });

    return NextResponse.json({ success: true, data: table }, { status: 201 });
  } catch (error) {
    console.error("Create table error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create table" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("TABLES", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const body = await request.json();
    const { id, status, tableNumber, capacity } = body;

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (tableNumber) data.tableNumber = parseInt(tableNumber);
    if (capacity) data.capacity = parseInt(capacity);

    const table = await prisma.table.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: table });
  } catch (error) {
    console.error("Update table error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update table" },
      { status: 500 },
    );
  }
}
