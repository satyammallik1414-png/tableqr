import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPlatformFee } from "@/lib/platform-fee";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;
    if (!session?.user || !restaurantId) return NextResponse.json({ success: false, error: "Restaurant account required" }, { status: 403 });

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
    };
    const platformFee = await getPlatformFee(restaurantId);

    const prefs = savedData?.prefs || {
      notifications: true,
      loyaltyProgram: true,
      autoDeduct: false,
    };
    const paymentGateway = { enabled: false, provider: "razorpay", configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET), ...(savedData?.paymentGateway || {}) };

    const payment = savedData?.payment ? {
      collectPaymentUpfront: false,
      upiEnabled: true,
      upiId: "smartserve@upi",
      payeeName: restaurant?.name || "SmartServe Restaurant",
      qrImageUrl: "",
      qrDisplayMode: "DYNAMIC",
      cashEnabled: true,
      cardEnabled: true,
      ...savedData.payment,
    } : {
      collectPaymentUpfront: false,
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
        restaurant,
        tax,
        platformFee,
        prefs,
        payment,
        paymentGateway,
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
    const restaurantId = session?.user?.restaurantId;
    if (!session?.user || !restaurantId) return NextResponse.json({ success: false, error: "Restaurant account required" }, { status: 403 });

    const body = await request.json();
    const { restaurant, tax, prefs, payment, paymentGateway } = body;

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
      tax: { cgst: Number(tax?.cgst) || 0, sgst: Number(tax?.sgst) || 0 },
      prefs: prefs || { notifications: true, loyaltyProgram: true, autoDeduct: false },
      payment: payment || {
        collectPaymentUpfront: false,
        upiEnabled: true,
        upiId: "smartserve@upi",
        payeeName: restaurant?.name || "SmartServe Restaurant",
        qrImageUrl: "",
        qrDisplayMode: "DYNAMIC",
        cashEnabled: true,
        cardEnabled: true,
      },
      paymentGateway: { enabled: Boolean(paymentGateway?.enabled), provider: "razorpay" },
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
