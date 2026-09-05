import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { planSchema } from "@/lib/validations/super-admin";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET() {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { monthlyPrice: "asc" },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Fetch Plans Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription plans." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = planSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      description,
      monthlyPrice,
      yearlyPrice,
      maxBranches,
      maxStaff,
      maxCustomers,
      maxOrders,
      trialDays,
      isActive,
      features,
    } = parsed.data;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Plan slug already exists." },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        slug,
        description,
        monthlyPrice,
        yearlyPrice,
        maxBranches,
        maxStaff,
        maxCustomers,
        maxOrders,
        trialDays,
        isActive,
        features: features ? (features as unknown as Prisma.InputJsonValue) : undefined,
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "CREATE_SUBSCRIPTION_PLAN",
      entity: "SubscriptionPlan",
      entityId: plan.id,
      metadata: { name: plan.name, monthlyPrice },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription plan created successfully.",
      data: plan,
    });
  } catch (error) {
    console.error("Create Plan Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create subscription plan." },
      { status: 500 }
    );
  }
}
