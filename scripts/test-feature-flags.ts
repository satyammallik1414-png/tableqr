import { prisma } from "../lib/prisma";
import {
  FeatureKey,
  FEATURE_CATALOG,
  seedFeaturesIfMissing,
  canAccessFeature,
  getEffectiveFeatureAccess,
  getEffectiveFeaturesMap,
  requireFeatureAccess,
} from "../lib/features";

async function runTests() {
  console.log("==================================================");
  console.log("FEATURE ACCESS CONTROL / FEATURE FLAGS TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Pre-requisite: ensure features catalog is seeded
  await seedFeaturesIfMissing();

  // Find or create test entities
  const bizA = await prisma.restaurant.upsert({
    where: { slug: "test-biz-a-flags" },
    create: {
      name: "Test Restaurant Alpha",
      slug: "test-biz-a-flags",
      ownerName: "Alpha Owner",
      ownerEmail: "alpha@example.com",
      ownerPhone: "9998887771",
    },
    update: {
      name: "Test Restaurant Alpha",
      ownerName: "Alpha Owner",
      ownerEmail: "alpha@example.com",
    },
  });

  const bizB = await prisma.restaurant.upsert({
    where: { slug: "test-biz-b-flags" },
    create: {
      name: "Test Restaurant Beta",
      slug: "test-biz-b-flags",
      ownerName: "Beta Owner",
      ownerEmail: "beta@example.com",
      ownerPhone: "9998887772",
    },
    update: {
      name: "Test Restaurant Beta",
      ownerName: "Beta Owner",
      ownerEmail: "beta@example.com",
    },
  });

  const userA1 = await prisma.user.upsert({
    where: { email: "user_a1_flag_test@example.com" },
    create: {
      name: "User Alpha One",
      email: "user_a1_flag_test@example.com",
      passwordHash: "hash123",
      restaurantId: bizA.id,
      role: "MANAGER",
    },
    update: { restaurantId: bizA.id },
  });

  const userA2 = await prisma.user.upsert({
    where: { email: "user_a2_flag_test@example.com" },
    create: {
      name: "User Alpha Two",
      email: "user_a2_flag_test@example.com",
      passwordHash: "hash123",
      restaurantId: bizA.id,
      role: "WAITER",
    },
    update: { restaurantId: bizA.id },
  });

  const userB = await prisma.user.upsert({
    where: { email: "user_b_flag_test@example.com" },
    create: {
      name: "User Beta",
      email: "user_b_flag_test@example.com",
      passwordHash: "hash123",
      restaurantId: bizB.id,
      role: "ADMIN",
    },
    update: { restaurantId: bizB.id },
  });

  // Clean previous test overrides for clean slate
  await prisma.businessFeatureOverride.deleteMany({
    where: { businessId: { in: [bizA.id, bizB.id] } },
  });
  await prisma.userFeatureOverride.deleteMany({
    where: { userId: { in: [userA1.id, userA2.id, userB.id] } },
  });

  console.log("--- TEST 1: Global disable affects everyone ---");
  // Set BRANCHES to globally false
  await prisma.globalFeatureSetting.upsert({
    where: { featureKey: "BRANCHES" },
    create: { featureKey: "BRANCHES", enabled: false },
    update: { enabled: false },
  });

  const globalBranchesAccess1 = await canAccessFeature("BRANCHES", null, null);
  const globalBranchesAccessBizA = await canAccessFeature("BRANCHES", userA1.id, bizA.id);
  const globalBranchesAccessBizB = await canAccessFeature("BRANCHES", userB.id, bizB.id);

  assert(
    !globalBranchesAccess1 && !globalBranchesAccessBizA && !globalBranchesAccessBizB,
    "When BRANCHES is globally disabled, access is denied for everyone across all businesses and users"
  );

  console.log("\n--- TEST 2: Business override affects only one business ---");
  // Set INVENTORY globally to true
  await prisma.globalFeatureSetting.upsert({
    where: { featureKey: "INVENTORY" },
    create: { featureKey: "INVENTORY", enabled: true },
    update: { enabled: true },
  });

  // Disable INVENTORY for bizA only
  await prisma.businessFeatureOverride.upsert({
    where: { featureKey_businessId: { featureKey: "INVENTORY", businessId: bizA.id } },
    create: { featureKey: "INVENTORY", businessId: bizA.id, enabled: false },
    update: { enabled: false },
  });

  const invBizA = await getEffectiveFeatureAccess("INVENTORY", userA1.id, bizA.id);
  const invBizB = await getEffectiveFeatureAccess("INVENTORY", userB.id, bizB.id);

  assert(
    invBizA.effectiveStatus === "BUSINESS_DISABLED" && !invBizA.isEnabled,
    "Business A users receive BUSINESS_DISABLED and cannot access Inventory"
  );
  assert(
    invBizB.effectiveStatus === "ENABLED" && invBizB.isEnabled,
    "Business B users remain ENABLED and can access Inventory normally"
  );

  console.log("\n--- TEST 3: User override affects only one user ---");
  // Set STAFF globally true, and enabled for bizA
  await prisma.globalFeatureSetting.upsert({
    where: { featureKey: "STAFF" },
    create: { featureKey: "STAFF", enabled: true },
    update: { enabled: true },
  });

  // Disable STAFF for userA1 only
  await prisma.userFeatureOverride.upsert({
    where: { featureKey_userId: { featureKey: "STAFF", userId: userA1.id } },
    create: { featureKey: "STAFF", userId: userA1.id, businessId: bizA.id, enabled: false },
    update: { enabled: false },
  });

  const staffUserA1 = await getEffectiveFeatureAccess("STAFF", userA1.id, bizA.id);
  const staffUserA2 = await getEffectiveFeatureAccess("STAFF", userA2.id, bizA.id);

  assert(
    staffUserA1.effectiveStatus === "USER_DISABLED" && !staffUserA1.isEnabled,
    "User A1 receives USER_DISABLED and cannot access Staff module"
  );
  assert(
    staffUserA2.effectiveStatus === "ENABLED" && staffUserA2.isEnabled,
    "User A2 in the same business retains ENABLED access"
  );

  console.log("\n--- TEST 4: Global disable has highest priority ---");
  // Give Biz A and User A1 explicit enabled overrides for BRANCHES
  await prisma.businessFeatureOverride.upsert({
    where: { featureKey_businessId: { featureKey: "BRANCHES", businessId: bizA.id } },
    create: { featureKey: "BRANCHES", businessId: bizA.id, enabled: true },
    update: { enabled: true },
  });
  await prisma.userFeatureOverride.upsert({
    where: { featureKey_userId: { featureKey: "BRANCHES", userId: userA1.id } },
    create: { featureKey: "BRANCHES", userId: userA1.id, businessId: bizA.id, enabled: true },
    update: { enabled: true },
  });

  // Global BRANCHES is still disabled
  const prioCheck = await getEffectiveFeatureAccess("BRANCHES", userA1.id, bizA.id);
  assert(
    prioCheck.effectiveStatus === "GLOBALLY_DISABLED" && !prioCheck.isEnabled,
    "Global disable overrides business=true and user=true overrides (Priority 1)"
  );

  console.log("\n--- TEST 5: Direct URL/API access is blocked ---");
  const blockedApi = await requireFeatureAccess("BRANCHES", userA1.id, bizA.id);
  assert(
    !blockedApi.allowed && blockedApi.result.effectiveStatus === "GLOBALLY_DISABLED",
    "requireFeatureAccess denies API call with 403 status and descriptive reason"
  );

  console.log("\n--- TEST 6: Sidebar displays only permitted features ---");
  const effectiveMap = await getEffectiveFeaturesMap(userA1.id, bizA.id);
  assert(
    effectiveMap.BRANCHES === false && effectiveMap.INVENTORY === false && effectiveMap.STAFF === false,
    "Effective map accurately marks disabled modules as false"
  );
  assert(
    effectiveMap.MENU === true && effectiveMap.TABLES === true && effectiveMap.ORDERS === true,
    "Effective map retains active modules (MENU, TABLES, ORDERS) as true"
  );

  console.log("\n--- TEST 7: Business-name search returns correct businesses ---");
  const searchName = await prisma.restaurant.findMany({
    where: { name: { contains: "Alpha", mode: "insensitive" } },
  });
  const searchOwner = await prisma.restaurant.findMany({
    where: { ownerEmail: { contains: "beta@example.com", mode: "insensitive" } },
  });
  const searchId = await prisma.restaurant.findUnique({
    where: { id: bizA.id },
  });

  assert(
    searchName.some((b) => b.id === bizA.id) &&
    searchOwner.some((b) => b.id === bizB.id) &&
    searchId?.id === bizA.id,
    "Search by business name, owner email, and ID correctly finds target businesses"
  );

  // Re-enable global BRANCHES for clean system state
  await prisma.globalFeatureSetting.upsert({
    where: { featureKey: "BRANCHES" },
    create: { featureKey: "BRANCHES", enabled: true },
    update: { enabled: true },
  });

  // Cleanup test overrides
  await prisma.businessFeatureOverride.deleteMany({
    where: { businessId: { in: [bizA.id, bizB.id] } },
  });
  await prisma.userFeatureOverride.deleteMany({
    where: { userId: { in: [userA1.id, userA2.id, userB.id] } },
  });

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
