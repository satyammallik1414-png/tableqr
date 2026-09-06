import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { orderSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";
import { requireFeatureAccess } from "@/lib/features";
import { generateOrderNumber } from "@/lib/qr-utils";
import { getPlatformFee } from "@/lib/platform-fee";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { tableId, branchId, items, subtotal, tax, notes, couponCode } = parsed.data;
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { restaurantId: true } });
    if (!branch) return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });
    const platformFee = await getPlatformFee(branch.restaurantId);
    const total = Math.round((subtotal + tax + platformFee) * 100) / 100;

    const orderNumber = generateOrderNumber();
    const now = new Date();

    const order = await prisma.order.create({
      data: {
        tableId,
        branchId,
        orderNumber,
        status: "RECEIVED",
        items: items as unknown as Prisma.InputJsonValue,
        subtotal,
        tax,
        serviceCharge: platformFee,
        discount: 0,
        total,
        notes,
        couponCode,
        submittedAt: now,
        lastUpdatedAt: now,
        orderItems: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            variants: item.variants as unknown as Prisma.InputJsonValue ?? [],
            addons: item.addons as unknown as Prisma.InputJsonValue ?? [],
            notes: item.notes,
            status: "RECEIVED",
          })),
        },
      },
      include: {
        orderItems: true,
        table: true,
      },
    });

    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED", currentOrderId: order.id },
      });
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.restaurantId) {
      const guard = await requireFeatureAccess("ORDERS", session.user.id, session.user.restaurantId);
      if (!guard.allowed) return guard.response;
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || session?.user?.branchId;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "100");

    const where: Record<string, unknown> = {};

    const role = session?.user?.role;
    const isSuperAdmin = ["SUPERADMIN", "SUPER_ADMIN"].includes((role ?? "").toUpperCase());

    if (!isSuperAdmin && session?.user?.restaurantId) {
      where.branch = { restaurantId: session.user.restaurantId };
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (status && status !== "ALL") {
      if (status.includes(",")) {
        where.status = { in: status.split(",") };
      } else {
        where.status = status;
      }
    }

    const now = new Date();
    // Auto-complete accepted orders when their restaurant-set timer expires.
    const overdueOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PREPARING", "RECEIVED", "READY"] },
      },
      select: {
        id: true,
        estimatedReadyAt: true,
        acceptedAt: true,
        estimatedReadyMinutes: true,
        createdAt: true,
      },
    });

    const completedOrderIds = overdueOrders
      .filter((o) => {
        if (o.estimatedReadyAt && o.estimatedReadyAt <= now) return true;
        const baseTime = o.acceptedAt || o.createdAt;
        if (baseTime && o.estimatedReadyMinutes) {
          const target = new Date(baseTime.getTime() + o.estimatedReadyMinutes * 60000);
          return target <= now;
        }
        return false;
      })
      .map((o) => o.id);

    if (completedOrderIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: { in: completedOrderIds } },
          data: { status: "COMPLETED", lastUpdatedAt: now },
        });
        await tx.orderItem.updateMany({
          where: { orderId: { in: completedOrderIds } },
          data: { status: "COMPLETED" },
        });
        for (const orderId of completedOrderIds) {
          await tx.orderStatusHistory.create({
            data: {
              orderId,
              status: "COMPLETED",
              note: "Preparation countdown completed. Order completed automatically.",
              changedBy: "System (Auto-Timer)",
            },
          });
        }
        const completedTables = await tx.order.findMany({ where: { id: { in: completedOrderIds }, tableId: { not: null } }, select: { tableId: true } });
        for (const { tableId } of completedTables) {
          if (!tableId) continue;
          const active = await tx.order.count({ where: { tableId, id: { notIn: completedOrderIds }, status: { in: ["PENDING", "ACCEPTED", "RECEIVED", "PREPARING", "READY", "SERVED"] } } });
          if (active === 0) await tx.table.update({ where: { id: tableId }, data: { status: "AVAILABLE", currentOrderId: null } });
        }
      });
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        orderItems: true,
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
          },
        },
        qrCode: {
          select: {
            id: true,
            type: true,
            tableName: true,
            secureToken: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
