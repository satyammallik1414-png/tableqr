import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";

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
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: { select: { id: true, name: true } },
          _count: { select: { orders: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error("Fetch Customers Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers." },
      { status: 500 }
    );
  }
}
