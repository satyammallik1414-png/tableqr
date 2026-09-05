import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, restaurantId: true, branchId: true },
  });
  console.log("=== USERS ===");
  console.log(JSON.stringify(users, null, 2));

  const restaurants = await prisma.restaurant.findMany({
    include: {
      branches: {
        include: {
          categories: { include: { menuItems: true } },
          qrCodes: true,
        },
      },
    },
  });

  console.log("=== RESTAURANTS ===");
  for (const r of restaurants) {
    console.log(`Restaurant [${r.id}] "${r.name}" (${r.slug})`);
    for (const b of r.branches) {
      console.log(`  Branch [${b.id}] "${b.name}"`);
      console.log(`  QR Codes:`, b.qrCodes.map((q) => ({ id: q.id, token: q.secureToken, type: q.type, active: q.active })));
      for (const c of b.categories) {
        if (c.menuItems.length > 0) {
          console.log(`    Category "${c.name}" (${c.id}):`);
          for (const m of c.menuItems) {
            console.log(`      Item: "${m.name}", price: ${m.price}, isVeg: ${m.isVeg}, isAvailable: ${m.isAvailable}`);
          }
        }
      }
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
