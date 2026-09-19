import data from "../data/eurostat-illegal-presence.json";

export type IllegalPresenceOrigin = {
  citizen: string;
  name: string;
  value: number;
  lng: number;
  lat: number;
};

export type IllegalPresencePack = {
  source: string;
  sourceUrl: string;
  definition: string;
  geo: string;
  geoLabel: string;
  peoplePerParticleDefault: number;
  years: number[];
  annualTotals: Record<string, number>;
  cumulativeThrough: Record<string, number>;
  euLandings: number[][];
  byYear: Record<string, IllegalPresenceOrigin[]>;
};

export const ILLEGAL_PRESENCE = data as unknown as IllegalPresencePack;

export function originsForYear(year: number): IllegalPresenceOrigin[] {
  return ILLEGAL_PRESENCE.byYear[String(year)] ?? [];
}

export function annualTotal(year: number): number {
  return ILLEGAL_PRESENCE.annualTotals[String(year)] ?? 0;
}

export function cumulativeThrough(year: number): number {
  return ILLEGAL_PRESENCE.cumulativeThrough[String(year)] ?? 0;
}
