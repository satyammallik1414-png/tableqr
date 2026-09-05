import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> },
) {
  try {
    const { branchId } = await params;

    const [categories, items] = await Promise.all([
      prisma.category.findMany({
        where: { branchId, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.menuItem.findMany({
        where: { category: { branchId, isActive: true } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { categories, items },
    });
  } catch (error) {
    console.error("Fetch menu by branch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch menu" },
      { status: 500 },
    );
  }
}
