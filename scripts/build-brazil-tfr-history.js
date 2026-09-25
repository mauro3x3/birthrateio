#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Brazil state TFR history (1940–2010) + keep BirthGauge 2024.
 *
 * Historic series: Sacco & Mendes Borges, Tabla 2 — Brasil 1940–2010 TGF de
 * período by UF, sourced from IBGE Departamento de Estudos e Análise da
 * Dinâmica Demográfica (in Leandro M. González, ed., ¿Convergencia
 * demográfica? Análisis comparativo…):
 *   https://www.aacademica.org/leandro.m.gonzalez/57.pdf
 *
 * Usage: node scripts/build-brazil-tfr-history.js
 */
const fs = require("fs");
const path = require("path");

const CATALOG = path.join(
  __dirname,
  "..",
  "src",
  "lib",
  "data",
  "subnational-maps.json",
);

const YEARS = [1940, 1950, 1960, 1970, 1980, 1991, 2000, 2010];

/** UF code → catalog slug / display name (matches bra-tfr geo). */
const UF = {
  ro: { slug: "brazil-rondonia", name: "Rondônia" },
  ac: { slug: "brazil-acre", name: "Acre" },
  am: { slug: "brazil-amazonas", name: "Amazonas" },
  rr: { slug: "brazil-roraima", name: "Roraima" },
  pa: { slug: "brazil-para", name: "Pará" },
  ap: { slug: "brazil-amapa", name: "Amapá" },
  to: { slug: "brazil-tocantins", name: "Tocantins" },
  ma: { slug: "brazil-maranhao", name: "Maranhão" },
  pi: { slug: "brazil-piaui", name: "Piauí" },
  ce: { slug: "brazil-ceara", name: "Ceará" },
  rn: { slug: "brazil-rio-grande-do-norte", name: "Rio Grande do Norte" },
  pb: { slug: "brazil-paraiba", name: "Paraíba" },
  pe: { slug: "brazil-pernambuco", name: "Pernambuco" },
  al: { slug: "brazil-alagoas", name: "Alagoas" },
  se: { slug: "brazil-sergipe", name: "Sergipe" },
  ba: { slug: "brazil-bahia", name: "Bahia" },
  mg: { slug: "brazil-minas-gerais", name: "Minas Gerais" },
  es: { slug: "brazil-espirito-santo", name: "Espírito Santo" },
  rj: { slug: "brazil-rio-de-janeiro", name: "Rio de Janeiro" },
  sp: { slug: "brazil-sao-paulo", name: "São Paulo" },
  pr: { slug: "brazil-parana", name: "Paraná" },
  sc: { slug: "brazil-santa-catarina", name: "Santa Catarina" },
  rs: { slug: "brazil-rio-grande-do-sul", name: "Rio Grande do Sul" },
  ms: { slug: "brazil-mato-grosso-do-sul", name: "Mato Grosso do Sul" },
  mt: { slug: "brazil-mato-grosso", name: "Mato Grosso" },
  go: { slug: "brazil-goias", name: "Goiás" },
  df: { slug: "brazil-federal", name: "Distrito Federal" },
};

/** Period TFR by UF, years aligned with YEARS. */
const HISTORY = {
  ro: [8.55, 9.51, 10.21, 9.72, 6.18, 3.47, 2.74, 1.96],
  ac: [8.71, 9.68, 10.4, 9.9, 6.88, 4.9, 3.63, 2.81],
  am: [7.66, 8.44, 9.07, 8.55, 6.75, 4.47, 3.32, 2.59],
  rr: [7.54, 8.38, 9.0, 8.57, 6.58, 4.77, 3.55, 2.58],
  pa: [6.8, 7.48, 7.99, 7.72, 6.31, 4.19, 3.14, 2.38],
  ap: [7.25, 8.06, 8.65, 8.24, 6.97, 4.62, 3.88, 2.69],
  to: [6.67, 7.41, 7.96, 7.58, 6.0, 3.86, 2.94, 2.18],
  ma: [6.64, 6.86, 7.11, 7.26, 6.93, 4.64, 3.2, 2.47],
  pi: [7.45, 8.1, 7.78, 7.84, 6.54, 3.78, 2.74, 1.97],
  ce: [8.3, 7.88, 7.53, 7.74, 6.05, 3.73, 2.84, 1.96],
  rn: [8.37, 8.31, 8.21, 8.44, 5.67, 3.36, 2.63, 1.91],
  pb: [8.39, 8.07, 7.58, 7.74, 6.19, 3.72, 2.53, 1.97],
  pe: [6.65, 7.17, 7.18, 7.03, 5.4, 3.26, 2.58, 1.94],
  al: [6.62, 7.25, 7.33, 7.58, 6.67, 4.04, 3.13, 2.22],
  se: [6.73, 7.44, 7.24, 7.87, 6.03, 3.58, 2.87, 1.97],
  ba: [6.75, 7.39, 7.32, 7.48, 6.23, 3.61, 2.49, 1.89],
  mg: [7.69, 7.56, 7.69, 6.17, 4.31, 2.67, 2.22, 1.72],
  es: [7.06, 7.19, 7.63, 6.44, 4.28, 2.75, 2.16, 1.75],
  rj: [4.41, 4.38, 4.53, 3.8, 2.94, 2.09, 2.06, 1.68],
  sp: [5.02, 4.65, 4.87, 3.94, 3.24, 2.28, 2.08, 1.7],
  pr: [5.97, 6.27, 6.51, 6.4, 4.12, 2.61, 2.22, 1.76],
  sc: [6.56, 7.23, 7.3, 6.1, 3.82, 2.57, 2.08, 1.65],
  rs: [5.08, 5.22, 5.11, 4.29, 3.11, 2.39, 2.16, 1.67],
  ms: [6.18, 6.77, 6.37, 6.54, 4.39, 2.92, 2.41, 2.02],
  mt: [6.62, 7.25, 6.82, 7.0, 4.7, 3.06, 2.43, 2.01],
  go: [5.71, 6.11, 6.16, 5.87, 4.3, 2.5, 2.23, 1.74],
  df: [6.85, 6.85, 6.85, 5.56, 3.62, 2.36, 2.0, 1.65],
};

/** Unweighted state mean from the same table (Promedio row). */
const NATIONAL_MEAN = {
  1940: 6.9,
  1950: 7.29,
  1960: 7.42,
  1970: 7.09,
  1980: 5.34,
  1991: 3.41,
  2000: 2.68,
  2010: 2.03,
};

const SOURCE_HIST =
  "Sacco & Mendes Borges, Tabla 2 — Brasil 1940–2010 TGF de período by state, " +
  "from IBGE Departamento de Estudos e Análise da Dinâmica Demográfica " +
  "(in L. M. González, ed., ¿Convergencia demográfica?).";
const SOURCE_URL =
  "https://www.aacademica.org/leandro.m.gonzalez/57.pdf";
const NOTE =
  "Historic years 1940–2010 are period TFR by today’s UF geography (Tocantins " +
  "and Mato Grosso do Sul back-cast on post-split borders). Colour domain is " +
  "fixed (1–10.5) so decades are comparable when you scrub. 2024 is BirthGauge " +
  "from registered births and IBGE women of childbearing age — not the same " +
  "method as the census-based historic series.";

const BIRTHGAUGE_2024 = {
  "brazil-rondonia": 1.58,
  "brazil-acre": 1.68,
  "brazil-amazonas": 1.83,
  "brazil-roraima": 2.0,
  "brazil-para": 1.63,
  "brazil-amapa": 1.8,
  "brazil-tocantins": 1.77,
  "brazil-maranhao": 1.59,
  "brazil-piaui": 1.52,
  "brazil-ceara": 1.43,
  "brazil-rio-grande-do-norte": 1.38,
  "brazil-paraiba": 1.55,
  "brazil-pernambuco": 1.5,
  "brazil-alagoas": 1.77,
  "brazil-sergipe": 1.5,
  "brazil-bahia": 1.4,
  "brazil-minas-gerais": 1.4,
  "brazil-espirito-santo": 1.65,
  "brazil-rio-de-janeiro": 1.3,
  "brazil-sao-paulo": 1.4,
  "brazil-parana": 1.5,
  "brazil-santa-catarina": 1.53,
  "brazil-rio-grande-do-sul": 1.41,
  "brazil-mato-grosso-do-sul": 1.62,
  "brazil-mato-grosso": 1.85,
  "brazil-goias": 1.56,
  "brazil-federal": 1.39,
};

function regionsForYear(yearIdx) {
  return Object.entries(HISTORY).map(([uf, series]) => {
    const meta = UF[uf];
    return {
      id: meta.slug,
      slug: meta.slug,
      name: meta.name,
      value: series[yearIdx],
    };
  });
}

function entry(year, regions, national, source, id) {
  const vals = regions.map((r) => r.value);
  return {
    id,
    iso3: "BRA",
    country: "Brazil",
    title: `Total fertility rate, Brazil ${year}`,
    metric: "tfr",
    unit: "children per woman",
    kind: "state",
    year,
    national,
    source,
    sourceUrl: SOURCE_URL,
    credit: null,
    geoUrl: "/geo/maps/bra-tfr.json",
    scale: "plasma",
    mid: 2.1,
    labelValues: true,
    note: NOTE,
    regions,
    min: Math.round(Math.min(...vals) * 100) / 100,
    max: Math.round(Math.max(...vals) * 100) / 100,
  };
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const newMaps = YEARS.map((year, i) =>
    entry(
      year,
      regionsForYear(i),
      NATIONAL_MEAN[year],
      `${SOURCE_HIST} Year ${year}.`,
      `bra-tfr-${year}`,
    ),
  );

  const regions2024 = Object.entries(UF).map(([, meta]) => ({
    id: meta.slug,
    slug: meta.slug,
    name: meta.name === "Distrito Federal" ? "Distrito Federal" : meta.name,
    value: BIRTHGAUGE_2024[meta.slug],
  }));
  // Prefer official DF label on the latest frame.
  newMaps.push(
    entry(
      2024,
      regions2024,
      1.48,
      "BirthGauge, Total Fertility Rate (Children per Woman), Brazil 2024 — state TFR from registered live births and IBGE women of childbearing age. National TFR 1.48.",
      "bra-tfr-2024",
    ),
  );
  // Keep legacy id as alias of latest so old links still resolve in managed sets.
  newMaps.push({
    ...newMaps[newMaps.length - 1],
    id: "bra-tfr",
    sourceUrl: "https://x.com/BirthGauge",
  });

  const drop = new Set([
    "bra-tfr",
    ...YEARS.map((y) => `bra-tfr-${y}`),
    "bra-tfr-2024",
  ]);
  const maps = catalog.maps.filter((m) => !drop.has(m.id));
  maps.push(...newMaps);
  fs.writeFileSync(CATALOG, JSON.stringify({ maps }, null, 2) + "\n");
  console.log(
    `Brazil TFR frames: ${YEARS.join(", ")}, 2024 (${newMaps.length} catalog rows)`,
  );
}

main();
