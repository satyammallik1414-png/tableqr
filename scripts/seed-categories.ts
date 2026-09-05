import { prisma } from "../lib/prisma";

async function main() {
  const branches = await prisma.branch.findMany();
  const defaultCategories = [
    { name: "Starters & Appetizers", sortOrder: 1 },
    { name: "Main Course", sortOrder: 2 },
    { name: "Fast Food & Snacks", sortOrder: 3 },
    { name: "Pizza & Pasta", sortOrder: 4 },
    { name: "Beverages & Drinks", sortOrder: 5 },
    { name: "Desserts & Sweets", sortOrder: 6 },
    { name: "Breads & Rice", sortOrder: 7 },
  ];

  console.log(`Found ${branches.length} branches.`);

  for (const branch of branches) {
    for (const cat of defaultCategories) {
      const existing = await prisma.category.findFirst({
        where: { branchId: branch.id, name: cat.name },
      });
      if (!existing) {
        await prisma.category.create({
          data: {
            branchId: branch.id,
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: true,
          },
        });
        console.log(`Added category "${cat.name}" to branch ${branch.name}`);
      }
    }
  }

  const count = await prisma.category.count();
  console.log(`Total categories in DB now: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
