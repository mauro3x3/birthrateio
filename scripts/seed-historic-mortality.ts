/* eslint-disable no-console */
// Seed only historic mortality series (HMD death rates, pre-1960 life
// expectancy, under-five mortality).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";
import { seedHistoricMortality } from "../src/lib/sources/historic-mortality-data";

async function main() {
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  await seedHistoricMortality(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
