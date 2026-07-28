/* eslint-disable no-console */
// Curated administrative subdivisions (wards / boroughs / districts /
// arrondissements) for major cities. Population is a point-in-time census
// figure — not a full time series. Prefer fewer accurate cities over many
// dubious ones.

import type { PrismaClient } from "@prisma/client";

export interface CitySubdivisionSeed {
  citySlug: string;
  slug: string;
  name: string;
  kind: "ward" | "borough" | "district" | "arrondissement" | "municipality";
  population: number;
  year: number;
  areaKm2?: number;
  sourceNote: string;
  sourceUrl?: string;
  sortOrder?: number;
}

const TOKYO_WARD_SOURCE =
  "Statistics Bureau of Japan, 2020 Population Census (確定値); ward = 特別区";
const TOKYO_WARD_URL =
  "https://www.stat.go.jp/english/data/kokusei/2020/summary.html";

const NYC_BOROUGH_SOURCE = "U.S. Census Bureau, 2020 Census (PL 94-171)";
const NYC_BOROUGH_URL = "https://www.census.gov/programs-surveys/decennial-census/decade/2020/2020-census-results.html";

const LONDON_BOROUGH_SOURCE =
  "ONS Census 2021 — usual resident population by local authority";
const LONDON_BOROUGH_URL =
  "https://www.ons.gov.uk/census/maps/choropleth/population/population-density/popdwn/population-density";

const PARIS_ARR_SOURCE =
  "INSEE — population municipale (recensement / populations légales)";
const PARIS_ARR_URL = "https://www.insee.fr/fr/statistiques/serie/001641007";

const BERLIN_BEZIRK_SOURCE =
  "Amt für Statistik Berlin-Brandenburg — Einwohnerregister / Bezirke";
const BERLIN_BEZIRK_URL =
  "https://www.statistik-berlin-brandenburg.de/";

export const CITY_SUBDIVISIONS: CitySubdivisionSeed[] = [
  // ---------------------------------------------------------------------------
  // Tokyo — 23 special wards (2020 census)
  // ---------------------------------------------------------------------------
  { citySlug: "tokyo", slug: "chiyoda", name: "Chiyoda", kind: "ward", population: 66680, year: 2020, areaKm2: 11.66, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 1 },
  { citySlug: "tokyo", slug: "chuo", name: "Chūō", kind: "ward", population: 169179, year: 2020, areaKm2: 10.21, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 2 },
  { citySlug: "tokyo", slug: "minato", name: "Minato", kind: "ward", population: 260486, year: 2020, areaKm2: 20.37, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 3 },
  { citySlug: "tokyo", slug: "shinjuku", name: "Shinjuku", kind: "ward", population: 349385, year: 2020, areaKm2: 18.22, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 4 },
  { citySlug: "tokyo", slug: "bunkyo", name: "Bunkyō", kind: "ward", population: 240069, year: 2020, areaKm2: 11.29, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 5 },
  { citySlug: "tokyo", slug: "taito", name: "Taitō", kind: "ward", population: 211444, year: 2020, areaKm2: 10.11, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 6 },
  { citySlug: "tokyo", slug: "sumida", name: "Sumida", kind: "ward", population: 272085, year: 2020, areaKm2: 13.77, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 7 },
  { citySlug: "tokyo", slug: "koto", name: "Kōtō", kind: "ward", population: 524310, year: 2020, areaKm2: 40.16, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 8 },
  { citySlug: "tokyo", slug: "shinagawa", name: "Shinagawa", kind: "ward", population: 422488, year: 2020, areaKm2: 22.84, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 9 },
  { citySlug: "tokyo", slug: "meguro", name: "Meguro", kind: "ward", population: 288088, year: 2020, areaKm2: 14.67, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 10 },
  { citySlug: "tokyo", slug: "ota", name: "Ōta", kind: "ward", population: 748081, year: 2020, areaKm2: 60.66, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 11 },
  { citySlug: "tokyo", slug: "setagaya", name: "Setagaya", kind: "ward", population: 943664, year: 2020, areaKm2: 58.05, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 12 },
  { citySlug: "tokyo", slug: "shibuya", name: "Shibuya", kind: "ward", population: 243883, year: 2020, areaKm2: 15.11, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 13 },
  { citySlug: "tokyo", slug: "nakano", name: "Nakano", kind: "ward", population: 344880, year: 2020, areaKm2: 15.59, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 14 },
  { citySlug: "tokyo", slug: "suginami", name: "Suginami", kind: "ward", population: 591108, year: 2020, areaKm2: 34.06, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 15 },
  { citySlug: "tokyo", slug: "toshima", name: "Toshima", kind: "ward", population: 301599, year: 2020, areaKm2: 13.01, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 16 },
  { citySlug: "tokyo", slug: "kita", name: "Kita", kind: "ward", population: 355213, year: 2020, areaKm2: 20.61, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 17 },
  { citySlug: "tokyo", slug: "arakawa", name: "Arakawa", kind: "ward", population: 217475, year: 2020, areaKm2: 10.16, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 18 },
  { citySlug: "tokyo", slug: "itabashi", name: "Itabashi", kind: "ward", population: 584483, year: 2020, areaKm2: 32.22, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 19 },
  { citySlug: "tokyo", slug: "nerima", name: "Nerima", kind: "ward", population: 752608, year: 2020, areaKm2: 48.08, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 20 },
  { citySlug: "tokyo", slug: "adachi", name: "Adachi", kind: "ward", population: 695043, year: 2020, areaKm2: 53.25, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 21 },
  { citySlug: "tokyo", slug: "katsushika", name: "Katsushika", kind: "ward", population: 453093, year: 2020, areaKm2: 34.8, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 22 },
  { citySlug: "tokyo", slug: "edogawa", name: "Edogawa", kind: "ward", population: 697932, year: 2020, areaKm2: 49.9, sourceNote: TOKYO_WARD_SOURCE, sourceUrl: TOKYO_WARD_URL, sortOrder: 23 },

  // ---------------------------------------------------------------------------
  // New York — 5 boroughs (2020 Census)
  // ---------------------------------------------------------------------------
  { citySlug: "new-york", slug: "manhattan", name: "Manhattan", kind: "borough", population: 1694251, year: 2020, areaKm2: 59.1, sourceNote: NYC_BOROUGH_SOURCE, sourceUrl: NYC_BOROUGH_URL, sortOrder: 1 },
  { citySlug: "new-york", slug: "brooklyn", name: "Brooklyn", kind: "borough", population: 2736074, year: 2020, areaKm2: 179.7, sourceNote: NYC_BOROUGH_SOURCE, sourceUrl: NYC_BOROUGH_URL, sortOrder: 2 },
  { citySlug: "new-york", slug: "queens", name: "Queens", kind: "borough", population: 2405464, year: 2020, areaKm2: 281.6, sourceNote: NYC_BOROUGH_SOURCE, sourceUrl: NYC_BOROUGH_URL, sortOrder: 3 },
  { citySlug: "new-york", slug: "bronx", name: "The Bronx", kind: "borough", population: 1472654, year: 2020, areaKm2: 109.2, sourceNote: NYC_BOROUGH_SOURCE, sourceUrl: NYC_BOROUGH_URL, sortOrder: 4 },
  { citySlug: "new-york", slug: "staten-island", name: "Staten Island", kind: "borough", population: 495747, year: 2020, areaKm2: 151.5, sourceNote: NYC_BOROUGH_SOURCE, sourceUrl: NYC_BOROUGH_URL, sortOrder: 5 },

  // ---------------------------------------------------------------------------
  // London — 32 boroughs + City of London (Census 2021)
  // ---------------------------------------------------------------------------
  { citySlug: "london", slug: "city-of-london", name: "City of London", kind: "borough", population: 8583, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 1 },
  { citySlug: "london", slug: "westminster", name: "Westminster", kind: "borough", population: 204236, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 2 },
  { citySlug: "london", slug: "kensington-and-chelsea", name: "Kensington and Chelsea", kind: "borough", population: 143375, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 3 },
  { citySlug: "london", slug: "hammersmith-and-fulham", name: "Hammersmith and Fulham", kind: "borough", population: 183157, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 4 },
  { citySlug: "london", slug: "wandsworth", name: "Wandsworth", kind: "borough", population: 327506, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 5 },
  { citySlug: "london", slug: "lambeth", name: "Lambeth", kind: "borough", population: 317654, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 6 },
  { citySlug: "london", slug: "southwark", name: "Southwark", kind: "borough", population: 307637, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 7 },
  { citySlug: "london", slug: "tower-hamlets", name: "Tower Hamlets", kind: "borough", population: 310306, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 8 },
  { citySlug: "london", slug: "hackney", name: "Hackney", kind: "borough", population: 259146, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 9 },
  { citySlug: "london", slug: "islington", name: "Islington", kind: "borough", population: 216589, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 10 },
  { citySlug: "london", slug: "camden", name: "Camden", kind: "borough", population: 210136, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 11 },
  { citySlug: "london", slug: "brent", name: "Brent", kind: "borough", population: 339800, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 12 },
  { citySlug: "london", slug: "ealing", name: "Ealing", kind: "borough", population: 367116, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 13 },
  { citySlug: "london", slug: "hounslow", name: "Hounslow", kind: "borough", population: 288181, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 14 },
  { citySlug: "london", slug: "richmond-upon-thames", name: "Richmond upon Thames", kind: "borough", population: 195278, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 15 },
  { citySlug: "london", slug: "kingston-upon-thames", name: "Kingston upon Thames", kind: "borough", population: 168063, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 16 },
  { citySlug: "london", slug: "merton", name: "Merton", kind: "borough", population: 215187, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 17 },
  { citySlug: "london", slug: "sutton", name: "Sutton", kind: "borough", population: 209639, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 18 },
  { citySlug: "london", slug: "croydon", name: "Croydon", kind: "borough", population: 390719, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 19 },
  { citySlug: "london", slug: "bromley", name: "Bromley", kind: "borough", population: 329991, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 20 },
  { citySlug: "london", slug: "lewisham", name: "Lewisham", kind: "borough", population: 300553, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 21 },
  { citySlug: "london", slug: "greenwich", name: "Greenwich", kind: "borough", population: 289068, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 22 },
  { citySlug: "london", slug: "bexley", name: "Bexley", kind: "borough", population: 246472, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 23 },
  { citySlug: "london", slug: "havering", name: "Havering", kind: "borough", population: 262029, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 24 },
  { citySlug: "london", slug: "barking-and-dagenham", name: "Barking and Dagenham", kind: "borough", population: 218939, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 25 },
  { citySlug: "london", slug: "redbridge", name: "Redbridge", kind: "borough", population: 310260, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 26 },
  { citySlug: "london", slug: "newham", name: "Newham", kind: "borough", population: 351136, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 27 },
  { citySlug: "london", slug: "waltham-forest", name: "Waltham Forest", kind: "borough", population: 278426, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 28 },
  { citySlug: "london", slug: "haringey", name: "Haringey", kind: "borough", population: 264238, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 29 },
  { citySlug: "london", slug: "enfield", name: "Enfield", kind: "borough", population: 329984, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 30 },
  { citySlug: "london", slug: "barnet", name: "Barnet", kind: "borough", population: 389344, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 31 },
  { citySlug: "london", slug: "harrow", name: "Harrow", kind: "borough", population: 261187, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 32 },
  { citySlug: "london", slug: "hillingdon", name: "Hillingdon", kind: "borough", population: 305909, year: 2021, sourceNote: LONDON_BOROUGH_SOURCE, sourceUrl: LONDON_BOROUGH_URL, sortOrder: 33 },

  // ---------------------------------------------------------------------------
  // Paris — 20 arrondissements (INSEE population municipale 2021)
  // ---------------------------------------------------------------------------
  { citySlug: "paris", slug: "1er", name: "1er arrondissement", kind: "arrondissement", population: 15926, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 1 },
  { citySlug: "paris", slug: "2e", name: "2e arrondissement", kind: "arrondissement", population: 21130, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 2 },
  { citySlug: "paris", slug: "3e", name: "3e arrondissement", kind: "arrondissement", population: 34025, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 3 },
  { citySlug: "paris", slug: "4e", name: "4e arrondissement", kind: "arrondissement", population: 29108, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 4 },
  { citySlug: "paris", slug: "5e", name: "5e arrondissement", kind: "arrondissement", population: 57386, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 5 },
  { citySlug: "paris", slug: "6e", name: "6e arrondissement", kind: "arrondissement", population: 40370, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 6 },
  { citySlug: "paris", slug: "7e", name: "7e arrondissement", kind: "arrondissement", population: 48896, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 7 },
  { citySlug: "paris", slug: "8e", name: "8e arrondissement", kind: "arrondissement", population: 35631, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 8 },
  { citySlug: "paris", slug: "9e", name: "9e arrondissement", kind: "arrondissement", population: 60026, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 9 },
  { citySlug: "paris", slug: "10e", name: "10e arrondissement", kind: "arrondissement", population: 83459, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 10 },
  { citySlug: "paris", slug: "11e", name: "11e arrondissement", kind: "arrondissement", population: 144296, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 11 },
  { citySlug: "paris", slug: "12e", name: "12e arrondissement", kind: "arrondissement", population: 140311, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 12 },
  { citySlug: "paris", slug: "13e", name: "13e arrondissement", kind: "arrondissement", population: 180005, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 13 },
  { citySlug: "paris", slug: "14e", name: "14e arrondissement", kind: "arrondissement", population: 135964, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 14 },
  { citySlug: "paris", slug: "15e", name: "15e arrondissement", kind: "arrondissement", population: 229472, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 15 },
  { citySlug: "paris", slug: "16e", name: "16e arrondissement", kind: "arrondissement", population: 162747, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 16 },
  { citySlug: "paris", slug: "17e", name: "17e arrondissement", kind: "arrondissement", population: 166708, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 17 },
  { citySlug: "paris", slug: "18e", name: "18e arrondissement", kind: "arrondissement", population: 192468, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 18 },
  { citySlug: "paris", slug: "19e", name: "19e arrondissement", kind: "arrondissement", population: 183011, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 19 },
  { citySlug: "paris", slug: "20e", name: "20e arrondissement", kind: "arrondissement", population: 193233, year: 2021, sourceNote: PARIS_ARR_SOURCE, sourceUrl: PARIS_ARR_URL, sortOrder: 20 },

  // ---------------------------------------------------------------------------
  // Berlin — 12 Bezirke (Amt für Statistik, 31 Dec 2023 register)
  // ---------------------------------------------------------------------------
  { citySlug: "berlin", slug: "mitte", name: "Mitte", kind: "district", population: 397134, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 1 },
  { citySlug: "berlin", slug: "friedrichshain-kreuzberg", name: "Friedrichshain-Kreuzberg", kind: "district", population: 293192, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 2 },
  { citySlug: "berlin", slug: "pankow", name: "Pankow", kind: "district", population: 420288, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 3 },
  { citySlug: "berlin", slug: "charlottenburg-wilmersdorf", name: "Charlottenburg-Wilmersdorf", kind: "district", population: 341982, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 4 },
  { citySlug: "berlin", slug: "spandau", name: "Spandau", kind: "district", population: 257016, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 5 },
  { citySlug: "berlin", slug: "steglitz-zehlendorf", name: "Steglitz-Zehlendorf", kind: "district", population: 308697, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 6 },
  { citySlug: "berlin", slug: "tempelhof-schoeneberg", name: "Tempelhof-Schöneberg", kind: "district", population: 355768, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 7 },
  { citySlug: "berlin", slug: "neukoelln", name: "Neukölln", kind: "district", population: 327945, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 8 },
  { citySlug: "berlin", slug: "treptow-koepenick", name: "Treptow-Köpenick", kind: "district", population: 294556, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 9 },
  { citySlug: "berlin", slug: "marzahn-hellersdorf", name: "Marzahn-Hellersdorf", kind: "district", population: 291487, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 10 },
  { citySlug: "berlin", slug: "lichtenberg", name: "Lichtenberg", kind: "district", population: 308341, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 11 },
  { citySlug: "berlin", slug: "reinickendorf", name: "Reinickendorf", kind: "district", population: 268792, year: 2023, sourceNote: BERLIN_BEZIRK_SOURCE, sourceUrl: BERLIN_BEZIRK_URL, sortOrder: 12 },
];

export async function seedCitySubdivisions(prisma: PrismaClient): Promise<void> {
  const cities = new Map(
    (
      await prisma.city.findMany({
        where: {
          slug: { in: [...new Set(CITY_SUBDIVISIONS.map((s) => s.citySlug))] },
        },
        select: { id: true, slug: true },
      })
    ).map((c) => [c.slug, c.id]),
  );

  let upserted = 0;
  let skipped = 0;

  for (const row of CITY_SUBDIVISIONS) {
    const cityId = cities.get(row.citySlug);
    if (!cityId) {
      skipped++;
      continue;
    }
    await prisma.citySubdivision.upsert({
      where: { cityId_slug: { cityId, slug: row.slug } },
      create: {
        cityId,
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        population: row.population,
        year: row.year,
        areaKm2: row.areaKm2 ?? null,
        sourceNote: row.sourceNote,
        sourceUrl: row.sourceUrl ?? null,
        sortOrder: row.sortOrder ?? 0,
      },
      update: {
        name: row.name,
        kind: row.kind,
        population: row.population,
        year: row.year,
        areaKm2: row.areaKm2 ?? null,
        sourceNote: row.sourceNote,
        sourceUrl: row.sourceUrl ?? null,
        sortOrder: row.sortOrder ?? 0,
      },
    });
    upserted++;
  }

  const cityCount = new Set(
    CITY_SUBDIVISIONS.filter((s) => cities.has(s.citySlug)).map(
      (s) => s.citySlug,
    ),
  ).size;

  console.log(
    `✔ ${upserted} city subdivisions upserted (${cityCount} cities${skipped ? `, ${skipped} skipped` : ""})`,
  );
}
