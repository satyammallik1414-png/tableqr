import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { businessSchema } from "@/lib/validations/super-admin";
import { createAuditLog } from "@/lib/audit-logger";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const { errorResponse } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
        { ownerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, businesses] = await Promise.all([
      prisma.restaurant.count({ where }),
      prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              branches: true,
              users: true,
              customers: true,
              subscriptions: true,
            },
          },
          subscriptions: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          },
        },
      }),
    ]);

    const formatted = businesses.map((b) => ({
      ...b,
      currentSubscription: b.subscriptions[0] ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error("Fetch Businesses Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch businesses." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { errorResponse, session } = await requireSuperAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = businessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      ownerName,
      ownerEmail,
      ownerPhone,
      address,
      phone,
      email,
      status,
      maxBranches,
      maxStaff,
      maxCustomers,
      maxOrders,
      planId,
    } = parsed.data;

    // Check slug uniqueness
    const existingSlug = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "Business slug already taken." },
        { status: 400 }
      );
    }

    // Check owner email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Owner email is already registered as a user." },
        { status: 400 }
      );
    }

    // Create Business, Default Admin User, Main Branch, and Subscription in a transaction
    const passwordHash = await hash("SmartServe@123!", 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name,
          slug,
          ownerName,
          ownerEmail,
          ownerPhone,
          address,
          phone: phone || ownerPhone,
          email: email || ownerEmail,
          status,
          maxBranches,
          maxStaff,
          maxCustomers,
          maxOrders,
        },
      });

      // 2. Create Main Branch
      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: "Main Branch",
          address: address || "Primary Location",
          phone: phone || ownerPhone,
        },
      });

      // 3. Create Owner / Admin User
      const adminUser = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          passwordHash,
          role: "ADMIN",
          phone: ownerPhone,
          restaurantId: restaurant.id,
          branchId: branch.id,
        },
      });

      // 4. Assign manager to branch
      await tx.branch.update({
        where: { id: branch.id },
        data: { managerId: adminUser.id },
      });

      // 5. Assign Subscription Plan if provided (or default Starter plan)
      let selectedPlan = null;
      if (planId) {
        selectedPlan = await tx.subscriptionPlan.findUnique({ where: { id: planId } });
      }
      if (!selectedPlan) {
        selectedPlan = await tx.subscriptionPlan.findFirst({ where: { isActive: true } });
      }

      if (selectedPlan) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (selectedPlan.trialDays || 14));

        await tx.subscription.create({
          data: {
            restaurantId: restaurant.id,
            planId: selectedPlan.id,
            status: "TRIAL",
            billingCycle: "MONTHLY",
            startDate: new Date(),
            endDate,
          },
        });
      }

      return restaurant;
    });

    await createAuditLog({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      actorRole: session?.user?.role,
      action: "CREATE_BUSINESS",
      entity: "Restaurant",
      entityId: result.id,
      restaurantId: result.id,
      metadata: { name: result.name, ownerEmail },
    });

    return NextResponse.json({
      success: true,
      message: "Business created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Create Business Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create business." },
      { status: 500 }
    );
  }
}
