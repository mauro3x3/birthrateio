/* eslint-disable no-console */
/** Seed only the new Western / enforcement migration datasets. */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";
import { seedEurostatReturns } from "../src/lib/sources/eurostat-returns-data";
import { seedEurostatLfpr } from "../src/lib/sources/eurostat-lfpr-data";
import { seedUnhcrRefugees } from "../src/lib/sources/unhcr-refugees-data";
import { seedIrregularStocks } from "../src/lib/sources/irregular-stocks-data";
import { seedFrontexDetections } from "../src/lib/sources/frontex-detections-data";
import { seedIomMissingMigrants } from "../src/lib/sources/iom-missing-migrants-data";

async function main() {
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  await seedEurostatReturns(prisma);
  await seedEurostatLfpr(prisma);
  await seedUnhcrRefugees(prisma);
  await seedIrregularStocks(prisma);
  await seedFrontexDetections(prisma);
  await seedIomMissingMigrants(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
