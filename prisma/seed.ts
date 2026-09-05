import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SmartServe AI database...");

  // 1. Create Super Admin User
  const superAdminPassword = await hash("SuperAdmin@123!", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@smartserve.ai" },
    update: {
      passwordHash: superAdminPassword,
      role: "SUPERADMIN",
    },
    create: {
      name: "Super Admin",
      email: "superadmin@smartserve.ai",
      passwordHash: superAdminPassword,
      role: "SUPERADMIN",
      isActive: true,
    },
  });
  console.log("Created Super Admin:", superAdmin.email);

  // 2. Create Subscription Plans
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "starter" },
    update: {},
    create: {
      name: "Starter Plan",
      slug: "starter",
      description: "Ideal for small single-location cafes",
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxBranches: 1,
      maxStaff: 5,
      maxCustomers: 500,
      maxOrders: 1000,
      trialDays: 14,
      isActive: true,
      features: ["1 Branch", "5 Staff Users", "Basic Analytics", "QR Menu"],
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "pro" },
    update: {},
    create: {
      name: "Pro Plan",
      slug: "pro",
      description: "For growing multi-branch restaurants",
      monthlyPrice: 2999,
      yearlyPrice: 29990,
      maxBranches: 5,
      maxStaff: 20,
      maxCustomers: 5000,
      maxOrders: 15000,
      trialDays: 14,
      isActive: true,
      features: ["5 Branches", "20 Staff Users", "Advanced Analytics", "Loyalty & Coupons", "KDS System"],
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "enterprise" },
    update: {},
    create: {
      name: "Enterprise Plan",
      slug: "enterprise",
      description: "For large restaurant chains & franchises",
      monthlyPrice: 7999,
      yearlyPrice: 79990,
      maxBranches: 25,
      maxStaff: 100,
      maxCustomers: 50000,
      maxOrders: 100000,
      trialDays: 30,
      isActive: true,
      features: ["25 Branches", "100 Staff Users", "Custom Integration", "Dedicated Support", "Multi-tenant Isolation"],
    },
  });
  console.log("Created Subscription Plans");

  // 3. Create Sample Business 1: Royal Spice Bistro
  const biz1 = await prisma.restaurant.upsert({
    where: { slug: "royal-spice-bistro" },
    update: {},
    create: {
      name: "Royal Spice Bistro",
      slug: "royal-spice-bistro",
      ownerName: "Rajesh Kumar",
      ownerEmail: "rajesh@royalspice.com",
      ownerPhone: "+91 98765 11111",
      address: "MG Road, Connaught Place, New Delhi",
      phone: "+91 98765 11111",
      email: "info@royalspice.com",
      gstNumber: "07AAAAA0000A1Z5",
      currency: "INR",
      status: "ACTIVE",
    },
  });

  // Branch for Business 1
  const branch1 = await prisma.branch.upsert({
    where: { id: "royal-spice-main" },
    update: {},
    create: {
      id: "royal-spice-main",
      restaurantId: biz1.id,
      name: "Connaught Place Main",
      address: "MG Road, Connaught Place, New Delhi",
      phone: "+91 98765 11111",
    },
  });

  // Admin User for Business 1
  const biz1AdminPassword = await hash("Admin@123", 10);
  const biz1Admin = await prisma.user.upsert({
    where: { email: "admin@royalspice.com" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      email: "admin@royalspice.com",
      passwordHash: biz1AdminPassword,
      role: "ADMIN",
      restaurantId: biz1.id,
      branchId: branch1.id,
    },
  });

  await prisma.branch.update({
    where: { id: branch1.id },
    data: { managerId: biz1Admin.id },
  });

  // Business 1 Subscription
  const endDate1 = new Date();
  endDate1.setFullYear(endDate1.getFullYear() + 1);
  const sub1 = await prisma.subscription.create({
    data: {
      restaurantId: biz1.id,
      planId: proPlan.id,
      status: "ACTIVE",
      billingCycle: "YEARLY",
      startDate: new Date(),
      endDate: endDate1,
    },
  });

  // Business 1 Invoice
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-001",
      restaurantId: biz1.id,
      subscriptionId: sub1.id,
      amount: 29990,
      taxAmount: 5398.2,
      total: 35388.2,
      status: "PAID",
      dueDate: new Date(),
      paidAt: new Date(),
    },
  });

  // 4. Create Sample Business 2: Urban Chai Cafe (Demo Restaurant)
  const biz2 = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      ownerName: "Anita Sharma",
      ownerEmail: "anita@demo.com",
      ownerPhone: "+91 98765 43210",
      address: "123, Main Street, Mumbai - 400001",
      phone: "+91 98765 43210",
      email: "demo@smartserve.ai",
      gstNumber: "27AAAAA0000A1Z5",
      currency: "INR",
      status: "ACTIVE",
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { id: "demo-branch-1" },
    update: {},
    create: {
      id: "demo-branch-1",
      restaurantId: biz2.id,
      name: "Main Branch",
      address: "123, Main Street, Mumbai - 400001",
      phone: "+91 98765 43210",
    },
  });

  const adminPassword = await hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@smartserve.ai" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@smartserve.ai",
      passwordHash: adminPassword,
      role: "ADMIN",
      restaurantId: biz2.id,
      branchId: branch2.id,
    },
  });

  const kitchenPassword = await hash("Kitchen@123", 10);
  await prisma.user.upsert({
    where: { email: "kitchen@smartserve.ai" },
    update: {},
    create: {
      name: "Kitchen Staff",
      email: "kitchen@smartserve.ai",
      passwordHash: kitchenPassword,
      role: "KITCHEN",
      restaurantId: biz2.id,
      branchId: branch2.id,
    },
  });

  const cashierPassword = await hash("Cashier@123", 10);
  await prisma.user.upsert({
    where: { email: "cashier@smartserve.ai" },
    update: {},
    create: {
      name: "Cashier User",
      email: "cashier@smartserve.ai",
      passwordHash: cashierPassword,
      role: "CASHIER",
      restaurantId: biz2.id,
      branchId: branch2.id,
    },
  });

  // Business 2 Subscription
  const endDate2 = new Date();
  endDate2.setMonth(endDate2.getMonth() + 1);
  await prisma.subscription.create({
    data: {
      restaurantId: biz2.id,
      planId: starterPlan.id,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      startDate: new Date(),
      endDate: endDate2,
    },
  });

  // Create Tables for Business 2
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { id: `demo-table-${i}` },
      update: {},
      create: {
        id: `demo-table-${i}`,
        branchId: branch2.id,
        tableNumber: i,
        capacity: i % 3 === 0 ? 6 : 4,
        status: "AVAILABLE",
      },
    });
  }

  // Create Sample Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      actorEmail: superAdmin.email,
      actorRole: "SUPERADMIN",
      action: "SEED_DATABASE",
      entity: "System",
      metadata: { message: "Initial Super Admin database seed executed." },
    },
  });

  // Create Platform Settings
  await prisma.platformSetting.upsert({
    where: { key: "platformName" },
    update: {},
    create: { key: "platformName", value: "SmartServe AI", description: "Global Platform Name" },
  });

  await prisma.platformSetting.upsert({
    where: { key: "defaultCurrency" },
    update: {},
    create: { key: "defaultCurrency", value: "INR", description: "Default Platform Currency" },
  });

  console.log("\n✅ Seed completed successfully!");
  console.log("\nSuper Admin Credentials:");
  console.log("  Super Admin: superadmin@smartserve.ai / SuperAdmin@123!");
  console.log("\nBusiness Admin Credentials:");
  console.log("  Admin:       admin@smartserve.ai / Admin@123");
  console.log("  Kitchen:     kitchen@smartserve.ai / Kitchen@123");
  console.log("  Cashier:     cashier@smartserve.ai / Cashier@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
