import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit-logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Subscription plan not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("Fetch Plan Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription plan." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Subscription plan not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        monthlyPrice: body.monthlyPrice ?? existing.monthlyPrice,
        yearlyPrice: body.yearlyPrice ?? existing.yearlyPrice,
        maxBranches: body.maxBranches ?? existing.maxBranches,
        maxStaff: body.maxStaff ?? existing.maxStaff,
        maxCustomers: body.maxCustomers ?? existing.maxCustomers,
        maxOrders: body.maxOrders ?? existing.maxOrders,
        trialDays: body.trialDays ?? existing.trialDays,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        features: body.features ?? existing.features,
      },
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "UPDATE_SUBSCRIPTION_PLAN",
      entity: "SubscriptionPlan",
      entityId: id,
      metadata: { name: updated.name, changes: body },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription plan updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Update Plan Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update subscription plan." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Subscription plan not found." },
        { status: 404 }
      );
    }

    if (existing._count.subscriptions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete plan with active subscriptions. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await prisma.subscriptionPlan.delete({ where: { id } });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "DELETE_SUBSCRIPTION_PLAN",
      entity: "SubscriptionPlan",
      entityId: id,
      metadata: { deletedPlanName: existing.name },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription plan deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Plan Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subscription plan." },
      { status: 500 }
    );
  }
}
