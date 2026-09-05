import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffSchema } from "@/lib/validations";
import { hash } from "bcryptjs";
import { requireFeatureAccess } from "@/lib/features";

export async function GET() {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const guard = await requireFeatureAccess("STAFF", session?.user?.id, restaurantId);
    if (!guard.allowed) return guard.response;

    const staff = await prisma.user.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error("Fetch staff error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch staff" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const guard = await requireFeatureAccess("STAFF", session?.user?.id, restaurantId);
    if (!guard.allowed) return guard.response;

    const body = await request.json();
    const parsed = staffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const defaultPassword = "Welcome@123";
    const passwordHash = await hash(defaultPassword, 12);

    const staff = await prisma.user.create({
      data: {
        ...parsed.data,
        passwordHash,
        restaurantId,
      },
    });

    return NextResponse.json(
      { success: true, data: staff, message: `Temporary password: ${defaultPassword}` },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create staff" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const guard = await requireFeatureAccess("STAFF", session?.user?.id, restaurantId);
    if (!guard.allowed) return guard.response;

    const body = await request.json();
    const { id, isActive } = body;

    const staff = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update staff" },
      { status: 500 },
    );
  }
}
