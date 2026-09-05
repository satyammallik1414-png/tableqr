import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding QR Demo data...");

  const restaurant = await prisma.restaurant.findFirst({
    include: {
      branches: {
        include: {
          tables: true,
          categories: {
            include: { menuItems: true },
          },
        },
      },
    },
  });

  if (!restaurant || restaurant.branches.length === 0) {
    console.log("No restaurant or branches found. Run main seed first.");
    return;
  }

  const branch = restaurant.branches[0];
  console.log(`Using restaurant: ${restaurant.name} (${restaurant.id}), branch: ${branch.name}`);

  // 1. Seed Restaurant Menu QR
  const menuQr = await prisma.restaurantQRCode.upsert({
    where: { secureToken: "demo-menu-qr" },
    update: { active: true },
    create: {
      secureToken: "demo-menu-qr",
      type: "RESTAURANT_MENU",
      businessId: restaurant.id,
      branchId: branch.id,
      active: true,
      scanCount: 14,
    },
  });
  console.log("Seeded Restaurant Menu QR:", menuQr.secureToken);

  // 2. Seed Table 1 QR
  let table = branch.tables[0];
  if (!table) {
    table = await prisma.table.create({
      data: {
        branchId: branch.id,
        tableNumber: 1,
        capacity: 4,
        status: "AVAILABLE",
      },
    });
  }

  const tableQr = await prisma.restaurantQRCode.upsert({
    where: { secureToken: "demo-table-1" },
    update: { active: true, tableId: table.id, tableName: `Table ${table.tableNumber}` },
    create: {
      secureToken: "demo-table-1",
      type: "TABLE",
      businessId: restaurant.id,
      branchId: branch.id,
      tableId: table.id,
      tableName: `Table ${table.tableNumber}`,
      active: true,
      scanCount: 28,
    },
  });
  console.log("Seeded Table QR:", tableQr.secureToken);

  // 3. Seed a sample PENDING order
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber: "ORD-DEMO-001" },
  });

  if (!existingOrder) {
    const sampleItem = branch.categories[0]?.menuItems[0] || {
      id: "dummy-item-1",
      name: "Paneer Butter Masala",
      price: 280,
    };

    const pendingOrder = await prisma.order.create({
      data: {
        branchId: branch.id,
        tableId: table.id,
        orderNumber: "ORD-DEMO-001",
        orderType: "DINE_IN",
        status: "PENDING",
        customerName: "Rahul Sharma",
        customerPhone: "+91 98765 43210",
        qrCodeId: tableQr.id,
        items: [
          {
            menuItemId: sampleItem.id,
            name: sampleItem.name,
            quantity: 2,
            price: sampleItem.price,
            notes: "Make it medium spicy, please.",
          },
        ],
        subtotal: sampleItem.price * 2,
        tax: Math.round(sampleItem.price * 2 * 0.05 * 100) / 100,
        total: Math.round(sampleItem.price * 2 * 1.05 * 100) / 100,
        notes: "Serving on Table 1",
        idempotencyKey: "demo_order_idemp_key_001",
        submittedAt: new Date(Date.now() - 4 * 60000), // submitted 4 minutes ago
        lastUpdatedAt: new Date(),
        statusHistory: {
          create: {
            status: "PENDING",
            note: "Order submitted via Table 1 QR scan",
          },
        },
      },
    });

    console.log("Seeded sample PENDING order:", pendingOrder.orderNumber);
  }

  console.log("QR Demo seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
