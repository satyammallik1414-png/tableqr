import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { subscriptionSchema } from "@/lib/validations/super-admin";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET(req: Request) {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const restaurantId = searchParams.get("restaurantId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: { select: { id: true, name: true, slug: true, email: true } },
          plan: { select: { id: true, name: true, monthlyPrice: true, yearlyPrice: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: subscriptions,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error("Fetch Subscriptions Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscriptions." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = subscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, planId, status, billingCycle, autoRenew } = parsed.data;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Subscription plan not found." },
        { status: 400 }
      );
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : new Date();

    if (!body.endDate) {
      if (status === "TRIAL") {
        endDate.setDate(startDate.getDate() + (plan.trialDays || 14));
      } else if (billingCycle === "MONTHLY") {
        endDate.setMonth(startDate.getMonth() + 1);
      } else {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        restaurantId,
        planId,
        status,
        billingCycle,
        startDate,
        endDate,
        autoRenew,
      },
      include: {
        restaurant: { select: { name: true } },
        plan: { select: { name: true } },
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "ASSIGN_SUBSCRIPTION",
      entity: "Subscription",
      entityId: subscription.id,
      restaurantId,
      metadata: { planName: plan.name, status },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription assigned successfully.",
      data: subscription,
    });
  } catch (error) {
    console.error("Create Subscription Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create subscription." },
      { status: 500 }
    );
  }
}
