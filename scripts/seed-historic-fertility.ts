/* eslint-disable no-console */
// Seed only pre-1960 total fertility rate (Gapminder long-run series).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";
import { seedHistoricFertility } from "../src/lib/sources/historic-fertility-data";

async function main() {
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  await seedHistoricFertility(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
