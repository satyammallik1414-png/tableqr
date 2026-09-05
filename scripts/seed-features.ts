import { seedFeaturesIfMissing, FEATURE_CATALOG } from "../lib/features";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding feature catalog...");
  await seedFeaturesIfMissing();
  const features = await prisma.feature.findMany({
    include: { globalSetting: true },
  });
  console.log(`Successfully synced ${features.length} features.`);
  for (const f of features) {
    console.log(`- [${f.key}] ${f.name} (Global Enabled: ${f.globalSetting?.enabled ?? true})`);
  }
}

main()
  .catch((e) => {
    console.error("Error seeding features:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
