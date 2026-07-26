/* eslint-disable no-console */
// Seeds reference data (data sources + indicator catalogue). The bulk
// demographic data is loaded separately via `npm run ingest`, which fetches
// from the World Bank API and then generates derived pyramids/projections.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding reference data…");
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  console.log(
    "\n✅ Reference data seeded. Now run `npm run ingest` to load World Bank data.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
