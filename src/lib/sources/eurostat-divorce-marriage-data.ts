import pack from "@/lib/data/eurostat-divorce-marriage.json";

export type DivorceMarriagePack = typeof pack;
export type DivorceMarriageCountry = (typeof pack.countries)[number];

export const EUROSTAT_DIVORCE_MARRIAGE = pack;

export function getDivorceMarriage() {
  return EUROSTAT_DIVORCE_MARRIAGE;
}

/** Latest observation per country (year may differ when reporting lags). */
export function divorceMarriageLatestRows() {
  return pack.countries
    .map((c) => ({
      iso3: c.iso3,
      geo: c.geo,
      name: c.name,
      flag: c.flag,
      slug: c.slug,
      eu27: c.eu27,
      year: c.latest.year,
      value: c.latest.value,
    }))
    .sort((a, b) => b.value - a.value);
}
