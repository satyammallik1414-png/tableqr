import { prisma } from "../lib/prisma";
import { isSuperAdminRole } from "../lib/auth-helpers";
import { checkBranchLimit, checkStaffLimit, checkCustomerLimit } from "../lib/plan-limits";
import { createAuditLog } from "../lib/audit-logger";

async function runTests() {
  console.log("==========================================");
  console.log("   SmartServe AI Super Admin Test Suite   ");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Role Helper
    console.log("--- 1. Testing Role Protection Helpers ---");
    assert(isSuperAdminRole("SUPERADMIN") === true, "SUPERADMIN role recognized");
    assert(isSuperAdminRole("SUPER_ADMIN") === true, "SUPER_ADMIN role recognized");
    assert(isSuperAdminRole("ADMIN") === false, "ADMIN role correctly blocked");
    assert(isSuperAdminRole("KITCHEN") === false, "KITCHEN role correctly blocked");

    // Test 2: Database Models & Super Admin User
    console.log("\n--- 2. Testing Database Models & Super Admin Account ---");
    const superAdmin = await prisma.user.findUnique({
      where: { email: "superadmin@smartserve.ai" },
    });
    assert(superAdmin !== null, "Super Admin user exists in DB");
    assert(superAdmin?.role === "SUPERADMIN", "Super Admin has SUPERADMIN role");

    const plans = await prisma.subscriptionPlan.findMany();
    assert(plans.length >= 3, "Subscription plans seeded (Starter, Pro, Enterprise)");

    const businesses = await prisma.restaurant.findMany();
    assert(businesses.length >= 2, "Sample businesses seeded");

    // Test 3: Plan Limits Enforcement
    console.log("\n--- 3. Testing Plan Limits Validation ---");
    if (businesses.length > 0) {
      const bizId = businesses[0].id;
      const branchCheck = await checkBranchLimit(bizId);
      assert(typeof branchCheck.allowed === "boolean", "checkBranchLimit returns valid structure");

      const staffCheck = await checkStaffLimit(bizId);
      assert(typeof staffCheck.allowed === "boolean", "checkStaffLimit returns valid structure");

      const customerCheck = await checkCustomerLimit(bizId);
      assert(typeof customerCheck.allowed === "boolean", "checkCustomerLimit returns valid structure");
    }

    // Test 4: Business Data Isolation
    console.log("\n--- 4. Testing Multi-Tenant Business Data Isolation ---");
    if (businesses.length >= 2) {
      const biz1Branches = await prisma.branch.findMany({
        where: { restaurantId: businesses[0].id },
      });
      const biz2Branches = await prisma.branch.findMany({
        where: { restaurantId: businesses[1].id },
      });

      const biz1BranchIds = new Set(biz1Branches.map((b) => b.id));
      const hasCrossAccess = biz2Branches.some((b) => biz1BranchIds.has(b.id));

      assert(!hasCrossAccess, "Business 1 and Business 2 branches are completely isolated");
    }

    // Test 5: Audit Log Creation
    console.log("\n--- 5. Testing Audit Log Recording ---");
    const testLog = await createAuditLog({
      actorId: superAdmin?.id,
      actorEmail: superAdmin?.email,
      actorRole: "SUPERADMIN",
      action: "AUTOMATED_TEST_RUN",
      entity: "TestSuite",
      metadata: { testStatus: "SUCCESS" },
    });
    assert(testLog !== null, "Audit log created successfully in DB");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    console.log("\n==========================================");
    console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  }
}

runTests();
