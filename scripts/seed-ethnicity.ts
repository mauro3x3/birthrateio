/* eslint-disable no-console */
// Standalone seeder for ethnic/racial composition data. Safe to re-run
// (idempotent). Requires countries + the NATIONAL_CENSUS data source to exist;
// it ensures the source itself, so a full ingestion is not required.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources } from "../src/lib/sources/reference";
import { seedEthnicity } from "../src/lib/sources/ethnicity-data";

async function main() {
  await ensureSources(prisma);
  await seedEthnicity(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
