/* eslint-disable no-console */
// Standalone seeder for all curated (non-World-Bank) datasets: ethnic & births
// composition and abortion rates. Idempotent and safe to re-run. Requires
// countries to already exist (run the World Bank ingestion at least once).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ensureSources, ensureIndicators } from "../src/lib/sources/reference";
import { seedEthnicity } from "../src/lib/sources/ethnicity-data";
import { seedAbortion } from "../src/lib/sources/abortion-data";
import { seedSocial } from "../src/lib/sources/social-data";
import { seedReligion } from "../src/lib/sources/religion-data";
import { seedMigrationFlows } from "../src/lib/sources/migration-flows-data";
import { seedBirthBackground } from "../src/lib/sources/birth-background-data";
import { seedWppProjections } from "../src/lib/sources/wpp-projections-data";
import { seedWupCities } from "../src/lib/sources/wup-cities-data";
import { seedCityFertility } from "../src/lib/sources/city-fertility-data";
import { seedCitySubdivisions } from "../src/lib/sources/city-subdivisions-data";
import { seedCityDemographics } from "../src/lib/sources/city-demographics-data";
import { seedCityRace, seedCityIncome } from "../src/lib/sources/city-race-income-data";
import { seedCities } from "../src/lib/sources/cities-data";
import { seedBirthGaugeNowcast } from "../src/lib/sources/birthgauge-data";
import { seedUnemploymentByBirthplace } from "../src/lib/sources/unemployment-birthplace-data";
import { seedCrimeByOrigin } from "../src/lib/sources/crime-by-origin-data";
import { seedAdmin1 } from "../src/lib/sources/admin1-data";
import { seedHistoricMortality } from "../src/lib/sources/historic-mortality-data";

async function main() {
  await ensureSources(prisma);
  await ensureIndicators(prisma);
  await seedCities(prisma);
  await seedEthnicity(prisma);
  await seedAbortion(prisma);
  await seedSocial(prisma);
  await seedReligion(prisma);
  await seedMigrationFlows(prisma);
  await seedBirthBackground(prisma);
  await seedWppProjections(prisma);
  await seedWupCities(prisma);
  await seedCityFertility(prisma);
  await seedCitySubdivisions(prisma);
  await seedCityDemographics(prisma);
  await seedCityRace(prisma);
  await seedCityIncome(prisma);
  await seedBirthGaugeNowcast(prisma);
  await seedUnemploymentByBirthplace(prisma);
  await seedCrimeByOrigin(prisma);
  await seedAdmin1(prisma);
  await seedHistoricMortality(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
