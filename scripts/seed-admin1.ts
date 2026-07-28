/* eslint-disable no-console */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";
import { seedAdmin1 } from "../src/lib/sources/admin1-data";

async function main() {
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  await seedAdmin1(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
