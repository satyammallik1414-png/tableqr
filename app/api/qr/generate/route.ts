import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecureToken } from "@/lib/qr-utils";
import { qrGenerateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const role = session.user.role;
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes((role ?? "").toUpperCase());
    if (!isSuperAdmin && !["ADMIN", "MANAGER"].includes(role ?? "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin or Manager role required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = qrGenerateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { type, branchId, tableId, tableName } = parseResult.data;

    // Verify branch belongs to user's restaurant if not super admin
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { restaurant: true },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && session.user.restaurantId && branch.restaurantId !== session.user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Branch does not belong to your restaurant." },
        { status: 403 }
      );
    }

    let resolvedTableName = tableName;
    if (type === "TABLE") {
      if (!tableId) {
        return NextResponse.json(
          { success: false, error: "Table ID is required for Table QR" },
          { status: 400 }
        );
      }

      const table = await prisma.table.findFirst({
        where: { id: tableId, branchId },
      });

      if (!table) {
        return NextResponse.json(
          { success: false, error: "Table not found in this branch" },
          { status: 404 }
        );
      }

      if (!resolvedTableName) {
        resolvedTableName = `Table ${table.tableNumber}`;
      }
    }

    const secureToken = generateSecureToken();

    // Check if an existing active QR exists for this target
    const existing = await prisma.restaurantQRCode.findFirst({
      where: {
        businessId: branch.restaurantId,
        branchId,
        type,
        ...(type === "TABLE" ? { tableId } : { tableId: null }),
        active: true,
      },
    });

    let qrCode;
    const regenerate = body.regenerate === true;

    if (existing && !regenerate) {
      qrCode = existing;
    } else if (existing && regenerate) {
      // Deactivate old one or update token
      qrCode = await prisma.restaurantQRCode.update({
        where: { id: existing.id },
        data: {
          secureToken,
          tableName: resolvedTableName || existing.tableName,
          active: true,
          updatedAt: new Date(),
        },
      });
    } else {
      qrCode = await prisma.restaurantQRCode.create({
        data: {
          secureToken,
          type,
          businessId: branch.restaurantId,
          branchId,
          tableId: type === "TABLE" ? tableId : null,
          tableName: type === "TABLE" ? resolvedTableName : null,
          active: true,
          createdBy: session.user.id,
        },
      });
    }

    const orderUrl =
      type === "TABLE"
        ? `/order/table/${qrCode.secureToken}`
        : `/order/restaurant/${qrCode.secureToken}`;

    return NextResponse.json({
      success: true,
      data: {
        ...qrCode,
        orderUrl,
      },
    });
  } catch (error) {
    console.error("QR generate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
