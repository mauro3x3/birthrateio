/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";
import { seedUnemploymentByBirthplace } from "../src/lib/sources/unemployment-birthplace-data";
import { seedCrimeByOrigin } from "../src/lib/sources/crime-by-origin-data";

async function main() {
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  await seedUnemploymentByBirthplace(prisma);
  await seedCrimeByOrigin(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
