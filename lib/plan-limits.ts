import { prisma } from "@/lib/prisma";
import type { PlanLimitValidationResult } from "@/types/super-admin";

export async function checkBranchLimit(restaurantId: string): Promise<PlanLimitValidationResult> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      maxBranches: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { plan: { select: { maxBranches: true } } },
      },
      _count: { select: { branches: true } },
    },
  });

  if (!restaurant) {
    return { allowed: false, currentCount: 0, maxLimit: 0, message: "Business not found." };
  }

  const currentCount = restaurant._count.branches;
  const activePlanLimit = restaurant.subscriptions[0]?.plan?.maxBranches;
  const maxLimit = restaurant.maxBranches ?? activePlanLimit ?? 5; // Default limit

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      currentCount,
      maxLimit,
      message: `Branch limit reached (${currentCount}/${maxLimit}). Upgrade your plan to create more branches.`,
    };
  }

  return { allowed: true, currentCount, maxLimit };
}

export async function checkStaffLimit(restaurantId: string): Promise<PlanLimitValidationResult> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      maxStaff: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { plan: { select: { maxStaff: true } } },
      },
      _count: { select: { users: true } },
    },
  });

  if (!restaurant) {
    return { allowed: false, currentCount: 0, maxLimit: 0, message: "Business not found." };
  }

  const currentCount = restaurant._count.users;
  const activePlanLimit = restaurant.subscriptions[0]?.plan?.maxStaff;
  const maxLimit = restaurant.maxStaff ?? activePlanLimit ?? 20;

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      currentCount,
      maxLimit,
      message: `Staff user limit reached (${currentCount}/${maxLimit}). Upgrade your plan to invite more staff.`,
    };
  }

  return { allowed: true, currentCount, maxLimit };
}

export async function checkCustomerLimit(restaurantId: string): Promise<PlanLimitValidationResult> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      maxCustomers: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { plan: { select: { maxCustomers: true } } },
      },
      _count: { select: { customers: true } },
    },
  });

  if (!restaurant) {
    return { allowed: false, currentCount: 0, maxLimit: 0, message: "Business not found." };
  }

  const currentCount = restaurant._count.customers;
  const activePlanLimit = restaurant.subscriptions[0]?.plan?.maxCustomers;
  const maxLimit = restaurant.maxCustomers ?? activePlanLimit ?? 1000;

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      currentCount,
      maxLimit,
      message: `Customer record limit reached (${currentCount}/${maxLimit}). Upgrade your plan to add more customers.`,
    };
  }

  return { allowed: true, currentCount, maxLimit };
}

export async function checkOrderLimit(restaurantId: string): Promise<PlanLimitValidationResult> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      maxOrders: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { plan: { select: { maxOrders: true } } },
      },
    },
  });

  if (!restaurant) {
    return { allowed: false, currentCount: 0, maxLimit: 0, message: "Business not found." };
  }

  // Count total orders across all branches of this restaurant
  const currentCount = await prisma.order.count({
    where: { branch: { restaurantId } },
  });

  const activePlanLimit = restaurant.subscriptions[0]?.plan?.maxOrders;
  const maxLimit = restaurant.maxOrders ?? activePlanLimit ?? 5000;

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      currentCount,
      maxLimit,
      message: `Order limit reached (${currentCount}/${maxLimit}). Upgrade your plan to process more orders.`,
    };
  }

  return { allowed: true, currentCount, maxLimit };
}
