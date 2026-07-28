/* eslint-disable no-console */
// Seeds annual urban-agglomeration population (1950–2035) from the UN World
// Urbanization Prospects 2018 into IndicatorValue rows keyed to each City.
//
// The compact source JSON (all ~1,860 agglomerations with coordinates) is
// produced offline by scripts/build-wup-cities.js. Here we match every city in
// our database to the nearest WUP agglomeration by lat/long, so newly added
// cities automatically inherit their historical series with no code changes.
//
// Idempotent: clears existing city-population values per matched city, then
// re-inserts. Estimates are marked ESTIMATE (<= base year) / PROJECTION (after).

import type { PrismaClient } from "@prisma/client";
import wupData from "../data/wup-cities.json";
import { SLUG } from "../indicators";

interface WupCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  values: (number | null)[];
}
interface WupFile {
  source: string;
  citation: string;
  unit: string;
  baseYear: number;
  years: number[];
  cities: WupCity[];
}

const FILE = wupData as WupFile;

// Max coordinate distance (degrees) to accept a match (~85 km). Major metros
// resolve to well under this; anything farther is treated as "no data".
const MAX_DEG = 0.75;

function nearest(lat: number, lng: number): WupCity | null {
  let best: WupCity | null = null;
  let bestD = Infinity;
  for (const c of FILE.cities) {
    const dLat = c.lat - lat;
    // Longitude degrees shrink with latitude; weight them so the threshold is
    // roughly isotropic in real distance.
    const dLng = (c.lng - lng) * Math.cos((lat * Math.PI) / 180);
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best && bestD <= MAX_DEG * MAX_DEG ? best : null;
}

export async function seedWupCities(prisma: PrismaClient) {
  const [indicator, source] = await Promise.all([
    prisma.indicator.findUnique({
      where: { slug: SLUG.cityPopulation },
      select: { id: true },
    }),
    prisma.dataSource.findUnique({
      where: { code: "UN_WUP" },
      select: { id: true },
    }),
  ]);
  if (!indicator) {
    console.log("⚠ city-population indicator missing; run ensureIndicators first");
    return;
  }

  const cities = await prisma.city.findMany({
    select: { id: true, name: true, latitude: true, longitude: true },
  });

  const records: Array<{
    subjectType: string;
    indicatorId: number;
    cityId: number;
    year: number;
    value: number;
    kind: string;
    sourceId: number | null;
  }> = [];
  const matchedCityIds: number[] = [];
  let matched = 0;

  for (const city of cities) {
    if (city.latitude == null || city.longitude == null) continue;
    const wup = nearest(city.latitude, city.longitude);
    if (!wup) continue;
    matched++;
    matchedCityIds.push(city.id);
    FILE.years.forEach((year, i) => {
      const v = wup.values[i];
      if (v == null) return;
      records.push({
        subjectType: "CITY",
        indicatorId: indicator.id,
        cityId: city.id,
        year,
        value: v,
        kind: year <= FILE.baseYear ? "ESTIMATE" : "PROJECTION",
        sourceId: source?.id ?? null,
      });
    });
  }

  // Replace only the city-population series for the cities we matched.
  await prisma.indicatorValue.deleteMany({
    where: { indicatorId: indicator.id, cityId: { in: matchedCityIds } },
  });

  const CHUNK = 2000;
  for (let i = 0; i < records.length; i += CHUNK) {
    await prisma.indicatorValue.createMany({ data: records.slice(i, i + CHUNK) });
  }

  console.log(
    `✔ ${records.length} city-population rows for ${matched}/${cities.length} cities (UN WUP 2018)`,
  );
}
