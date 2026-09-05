import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { checkBranchLimit } from "@/lib/plan-limits";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET(req: Request) {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const restaurantId = searchParams.get("restaurantId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    const [total, branches] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: { select: { id: true, name: true } },
          manager: { select: { id: true, name: true, email: true } },
          _count: { select: { tables: true, orders: true, users: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: branches,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error("Fetch Branches Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch branches." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { restaurantId, name, address, phone, managerId } = body;

    if (!restaurantId || !name) {
      return NextResponse.json(
        { success: false, error: "Business and Branch Name are required." },
        { status: 400 }
      );
    }

    // Enforce Plan Limits for Branch creation
    const limitCheck = await checkBranchLimit(restaurantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: limitCheck.message },
        { status: 403 }
      );
    }

    const branch = await prisma.branch.create({
      data: {
        restaurantId,
        name,
        address,
        phone,
        managerId: managerId || null,
      },
      include: {
        restaurant: { select: { name: true } },
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "CREATE_BRANCH",
      entity: "Branch",
      entityId: branch.id,
      restaurantId,
      metadata: { branchName: name },
    });

    return NextResponse.json({
      success: true,
      message: "Branch created successfully.",
      data: branch,
    });
  } catch (error) {
    console.error("Create Branch Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create branch." },
      { status: 500 }
    );
  }
}
