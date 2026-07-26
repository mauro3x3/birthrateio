/* eslint-disable no-console */
// ---------------------------------------------------------------------------
// Data ingestion CLI.
//
//   npm run ingest                       # World Bank + derived data
//   npm run ingest -- --source=worldbank
//   npm run ingest -- --derived          # only regenerate pyramids/projections
//
// Strategy: NEVER hit external APIs at request time. This script populates
// Postgres; the app reads only from Postgres. Re-runs are idempotent.
// ---------------------------------------------------------------------------

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runIngestion } from "../src/lib/sources/run-ingestion";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const m = process.argv.find((a) => a.startsWith(`--${name}`));
  if (!m) return undefined;
  const [, v] = m.split("=");
  return v ?? "true";
}

async function main() {
  const source = arg("source") as "worldbank" | "all" | undefined;
  const derivedOnly = Boolean(arg("derived"));
  const only = arg("only");
  const onlyIndicators = only ? only.split(",").map((s) => s.trim()) : undefined;
  const { rows } = await runIngestion(prisma, {
    source,
    derivedOnly,
    onlyIndicators,
  });
  console.log(`\n✅ Ingestion finished — ${rows} indicator values written.`);
}

main()
  .catch((e) => {
    console.error("\n❌ Ingestion failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
