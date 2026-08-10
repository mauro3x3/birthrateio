import { PrismaClient } from "@prisma/client";
import data from "../src/lib/data/admin1-demographics.json";

const prisma = new PrismaClient();

async function main() {
  const fert = await prisma.indicator.findUnique({
    where: { slug: "fertility-rate" },
  });
  if (!fert) throw new Error("fertility-rate indicator missing");

  let updated = 0;
  for (const [slug, series] of Object.entries(data.fertility)) {
    if (!slug.startsWith("united-states-")) continue;
    const admin = await prisma.admin1.findUnique({ where: { slug } });
    if (!admin) continue;
    for (const row of series) {
      const res = await prisma.indicatorValue.updateMany({
        where: {
          subjectType: "ADMIN1",
          indicatorId: fert.id,
          admin1Id: admin.id,
          year: row.year,
          dimension: null,
        },
        data: { value: row.value },
      });
      if (res.count === 0) {
        await prisma.indicatorValue.create({
          data: {
            subjectType: "ADMIN1",
            indicatorId: fert.id,
            admin1Id: admin.id,
            countryId: admin.countryId,
            year: row.year,
            value: row.value,
            kind: "ESTIMATE",
          },
        });
      }
      updated += 1;
    }
  }

  const ak = await prisma.admin1.findUnique({
    where: { slug: "united-states-alaska" },
  });
  const akVal = await prisma.indicatorValue.findFirst({
    where: {
      admin1Id: ak!.id,
      indicatorId: fert.id,
      year: 2023,
      dimension: null,
    },
  });
  console.log("updated", updated, "alaska", akVal?.value);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
