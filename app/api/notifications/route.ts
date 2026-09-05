import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const branchId = session?.user?.branchId;
    const userId = session?.user?.id;

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const branchId = session?.user?.branchId;

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { type, title, message, data } = body;

    const notification = await prisma.notification.create({
      data: {
        branchId,
        type,
        title,
        message,
        data: data ?? {},
      },
    });

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create notification" },
      { status: 500 },
    );
  }
}
