import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecureToken } from "@/lib/qr-utils";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || session.user.branchId;
    const type = searchParams.get("type");

    const role = session.user.role;
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes((role ?? "").toUpperCase());

    const where: Record<string, unknown> = {};

    if (!isSuperAdmin && session.user.restaurantId) {
      where.businessId = session.user.restaurantId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (type) {
      where.type = type;
    }

    const qrCodes = await prisma.restaurantQRCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            status: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const enriched = qrCodes.map((qr) => ({
      ...qr,
      orderUrl:
        qr.type === "TABLE"
          ? `/order/table/${qr.secureToken}`
          : `/order/restaurant/${qr.secureToken}`,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("List QR codes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list QR codes" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, active, regenerate, tableName } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "QR Code ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.restaurantQRCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "QR code not found" },
        { status: 404 }
      );
    }

    const role = session.user.role;
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes((role ?? "").toUpperCase());
    if (!isSuperAdmin && existing.businessId !== session.user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Cannot modify this QR code." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (typeof active === "boolean") {
      updateData.active = active;
    }

    if (tableName !== undefined) {
      updateData.tableName = tableName;
    }

    if (regenerate) {
      updateData.secureToken = generateSecureToken();
    }

    const updated = await prisma.restaurantQRCode.update({
      where: { id },
      data: updateData,
    });

    const orderUrl =
      updated.type === "TABLE"
        ? `/order/table/${updated.secureToken}`
        : `/order/restaurant/${updated.secureToken}`;

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        orderUrl,
      },
    });
  } catch (error) {
    console.error("Update QR code error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update QR code" },
      { status: 500 }
    );
  }
}
