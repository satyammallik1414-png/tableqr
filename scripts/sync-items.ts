import { prisma } from "../lib/prisma";

async function sync() {
  const babuBranch = await prisma.branch.findFirst({
    where: { restaurant: { name: { contains: "babu shaoo" } } },
    include: { categories: true },
  });

  if (!babuBranch) {
    console.log("babu shaoo branch not found");
    return;
  }
  console.log("Found babu branch:", babuBranch.id, babuBranch.name);

  // Find Main Course and Fast Food & Snacks categories in babu shaoo
  let mainCourse = babuBranch.categories.find((c) =>
    c.name.toLowerCase().includes("main course")
  );
  let fastFood = babuBranch.categories.find((c) =>
    c.name.toLowerCase().includes("fast food")
  );

  if (mainCourse) {
    const existing = await prisma.menuItem.findFirst({
      where: { categoryId: mainCourse.id, name: "chiken" },
    });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          categoryId: mainCourse.id,
          name: "chiken",
          description: "kichibhi",
          price: 59,
          preparationTime: 40,
          isVeg: true,
          isAvailable: true,
          sortOrder: 0,
        },
      });
      console.log("Created chiken in babu shaoo Main Course");
    } else {
      console.log("chiken already exists in babu shaoo");
    }
  }

  if (fastFood) {
    const existing = await prisma.menuItem.findFirst({
      where: { categoryId: fastFood.id, name: "masrum" },
    });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          categoryId: fastFood.id,
          name: "masrum",
          description: "kadhai",
          price: 500,
          preparationTime: 10,
          isVeg: true,
          isAvailable: true,
          sortOrder: 0,
        },
      });
      console.log("Created masrum in babu shaoo Fast Food & Snacks");
    } else {
      console.log("masrum already exists in babu shaoo");
    }
  }

  // Also ensure babu shaoo has Table 1
  const table1 = await prisma.table.findFirst({
    where: { branchId: babuBranch.id },
  });
  if (!table1) {
    await prisma.table.create({
      data: {
        branchId: babuBranch.id,
        tableNumber: 1,
        capacity: 4,
        status: "AVAILABLE",
        isActive: true,
      },
    });
    console.log("Created Table 1 in babu shaoo");
  } else {
    console.log("Table 1 exists in babu shaoo");
  }

  // Also ensure babu shaoo has a TABLE QR code for Table 1
  if (table1) {
    const existingTableQr = await prisma.restaurantQRCode.findFirst({
      where: {
        businessId: babuBranch.restaurantId,
        branchId: babuBranch.id,
        type: "TABLE",
        tableId: table1.id,
      },
    });
    if (!existingTableQr) {
      await prisma.restaurantQRCode.create({
        data: {
          businessId: babuBranch.restaurantId,
          branchId: babuBranch.id,
          type: "TABLE",
          tableId: table1.id,
          tableName: "Table 1",
          secureToken: "babu-table-1",
          active: true,
        },
      });
      console.log("Created Table 1 QR for babu shaoo: babu-table-1");
    }
  }
}

sync()
  .then(() => console.log("Finished sync successfully!"))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
