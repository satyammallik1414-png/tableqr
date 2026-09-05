import { prisma } from "@/lib/prisma";

export async function getQRDataByToken(token: string) {
  if (!token) return { error: "QR token is required" };

  try {
    const qrRecord = await prisma.restaurantQRCode.findUnique({
      where: { secureToken: token },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            phone: true,
            address: true,
            currency: true,
            isActive: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            isActive: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            status: true,
            isActive: true,
          },
        },
      },
    });

    if (!qrRecord) {
      return { error: "Invalid QR Code. Please check with restaurant staff." };
    }

    if (!qrRecord.active) {
      return { error: "This QR Code has been deactivated by the restaurant." };
    }

    if (!qrRecord.business.isActive || !qrRecord.branch.isActive) {
      return { error: "This restaurant or branch is currently unavailable." };
    }

    // Increment scan count in background
    prisma.restaurantQRCode
      .update({
        where: { id: qrRecord.id },
        data: { scanCount: { increment: 1 } },
      })
      .catch((err) => console.error("Error updating scanCount:", err));

    const categories = await prisma.category.findMany({
      where: {
        branchId: qrRecord.branchId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    let availableTables: Array<{ id: string; tableNumber: number; capacity: number }> = [];
    if (qrRecord.type === "RESTAURANT_MENU") {
      availableTables = await prisma.table.findMany({
        where: {
          branchId: qrRecord.branchId,
          isActive: true,
        },
        select: {
          id: true,
          tableNumber: true,
          capacity: true,
        },
        orderBy: { tableNumber: "asc" },
      });
    }

    // Fetch restaurant payment settings
    let settingRecord = await prisma.platformSetting.findUnique({
      where: { key: `settings_${qrRecord.businessId}` },
    });

    if (!settingRecord) {
      settingRecord = await prisma.platformSetting.findFirst({
        where: { key: { startsWith: "settings_" } },
        orderBy: { updatedAt: "desc" },
      });
    }

    const rawPayment = (settingRecord?.value as any)?.payment;
    const paymentSettings = rawPayment
      ? {
          collectPaymentUpfront: true,
          upiEnabled: true,
          upiId: "smartserve@upi",
          payeeName: qrRecord.business.name || "SmartServe Restaurant",
          qrImageUrl: "",
          qrDisplayMode: "DYNAMIC",
          cashEnabled: true,
          cardEnabled: true,
          ...rawPayment,
        }
      : {
          collectPaymentUpfront: true,
          upiEnabled: true,
          upiId: "smartserve@upi",
          payeeName: qrRecord.business.name || "SmartServe Restaurant",
          qrImageUrl: "",
          qrDisplayMode: "DYNAMIC",
          cashEnabled: true,
          cardEnabled: true,
        };

    return {
      data: {
        qr: {
          token: qrRecord.secureToken,
          type: qrRecord.type as "RESTAURANT_MENU" | "TABLE",
          tableName: qrRecord.tableName,
        },
        restaurant: qrRecord.business,
        branch: qrRecord.branch,
        table: qrRecord.table,
        availableTables,
        categories: JSON.parse(JSON.stringify(categories)),
        paymentSettings,
      },
    };
  } catch (err: unknown) {
    console.error("getQRDataByToken error:", err);
    return { error: "Failed to load restaurant data" };
  }
}

export async function revalidateBranchQRCodes(branchId: string) {
  try {
    const { revalidatePath } = await import("next/cache");
    const qrs = await prisma.restaurantQRCode.findMany({
      where: { branchId, active: true },
      select: { secureToken: true, type: true },
    });

    for (const qr of qrs) {
      const prefix = qr.type === "TABLE" ? "/order/table" : "/order/restaurant";
      try {
        revalidatePath(`${prefix}/${qr.secureToken}`);
        revalidatePath(`/api/qr/${qr.secureToken}`);
      } catch {
        // Safe fallback if called outside Next.js request context
      }
    }
    try {
      revalidatePath("/admin/menu");
      revalidatePath("/api/menu");
    } catch {
      // Safe fallback
    }
  } catch (err) {
    console.error("revalidateBranchQRCodes error:", err);
  }
}

