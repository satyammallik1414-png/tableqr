import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    let restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      const firstRest = await prisma.restaurant.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      restaurantId = firstRest?.id;
    }

    const restaurant = restaurantId
      ? await prisma.restaurant.findUnique({
          where: { id: restaurantId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            gstNumber: true,
            currency: true,
          },
        })
      : null;

    // Load custom settings from PlatformSetting
    const settingKey = restaurantId ? `settings_${restaurantId}` : "settings_default";
    const record = await prisma.platformSetting.findUnique({
      where: { key: settingKey },
    });

    const savedData = record?.value as any;

    const tax = savedData?.tax || {
      cgst: 2.5,
      sgst: 2.5,
      serviceCharge: 10,
    };

    const prefs = savedData?.prefs || {
      notifications: true,
      loyaltyProgram: true,
      autoDeduct: false,
    };

    const payment = savedData?.payment ? {
      collectPaymentUpfront: true,
      upiEnabled: true,
      upiId: "smartserve@upi",
      payeeName: restaurant?.name || "SmartServe Restaurant",
      qrImageUrl: "",
      qrDisplayMode: "DYNAMIC",
      cashEnabled: true,
      cardEnabled: true,
      ...savedData.payment,
    } : {
      collectPaymentUpfront: true,
      upiEnabled: true,
      upiId: "smartserve@upi",
      payeeName: restaurant?.name || "SmartServe Restaurant",
      qrImageUrl: "",
      qrDisplayMode: "DYNAMIC",
      cashEnabled: true,
      cardEnabled: true,
    };

    return NextResponse.json({
      success: true,
      data: {
        restaurant: restaurant || {
          name: "SmartServe AI",
          email: "admin@smartserve.ai",
          phone: "+91 98765 43210",
          address: "123, Restaurant Street, Mumbai - 400001",
          gstNumber: "00AAAAA0000A1Z5",
        },
        tax,
        prefs,
        payment,
      },
    });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    let restaurantId = session?.user?.restaurantId;

    if (!restaurantId) {
      const firstRest = await prisma.restaurant.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      restaurantId = firstRest?.id;
    }

    const body = await request.json();
    const { restaurant, tax, prefs, payment } = body;

    // 1. Update restaurant record if details provided
    if (restaurantId && restaurant) {
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          name: restaurant.name || undefined,
          email: restaurant.email || undefined,
          phone: restaurant.phone || undefined,
          address: restaurant.address || undefined,
          gstNumber: restaurant.gst || restaurant.gstNumber || undefined,
        },
      });
    }

    // 2. Persist extended settings (tax, preferences, payment methods) into PlatformSetting
    const settingKey = restaurantId ? `settings_${restaurantId}` : "settings_default";
    const payload = {
      tax: tax || { cgst: 2.5, sgst: 2.5, serviceCharge: 10 },
      prefs: prefs || { notifications: true, loyaltyProgram: true, autoDeduct: false },
      payment: payment || {
        collectPaymentUpfront: true,
        upiEnabled: true,
        upiId: "smartserve@upi",
        payeeName: restaurant?.name || "SmartServe Restaurant",
        qrImageUrl: "",
        qrDisplayMode: "DYNAMIC",
        cashEnabled: true,
        cardEnabled: true,
      },
      updatedAt: new Date().toISOString(),
    };

    await prisma.platformSetting.upsert({
      where: { key: settingKey },
      update: {
        value: payload,
        description: `Settings for restaurant ${restaurantId || "default"}`,
      },
      create: {
        key: settingKey,
        value: payload,
        description: `Settings for restaurant ${restaurantId || "default"}`,
      },
    });

    // Also sync settings_default for fallback consistency
    await prisma.platformSetting.upsert({
      where: { key: "settings_default" },
      update: {
        value: payload,
        description: "Default Platform Settings",
      },
      create: {
        key: "settings_default",
        value: payload,
        description: "Default Platform Settings",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      data: payload,
    });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
