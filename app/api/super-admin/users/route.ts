import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { checkStaffLimit } from "@/lib/plan-limits";
import { createAuditLog } from "@/lib/audit-logger";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const restaurantId = searchParams.get("restaurantId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          image: true,
          isActive: true,
          createdAt: true,
          restaurant: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { name, email, password, role, restaurantId, branchId, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists." },
        { status: 400 }
      );
    }

    // Check staff plan limits if creating a business user
    if (restaurantId && role !== "SUPERADMIN") {
      const limitCheck = await checkStaffLimit(restaurantId);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { success: false, error: limitCheck.message },
          { status: 403 }
        );
      }
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        restaurantId: restaurantId || null,
        branchId: branchId || null,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        restaurantId: true,
        branchId: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      restaurantId: restaurantId || null,
      metadata: { name, email, role },
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user." },
      { status: 500 }
    );
  }
}
