/** Peer countries for a briefing bar chart. Always include the subject separately. */
const BY_ISO3: Record<string, string[]> = {
  ISR: ["LBN", "JOR", "EGY", "SYR", "PSE"],
  JPN: ["KOR", "CHN", "TWN", "USA"],
  KOR: ["JPN", "CHN", "TWN", "USA"],
  CHN: ["JPN", "KOR", "IND", "USA"],
  IND: ["PAK", "BGD", "CHN", "IDN"],
  USA: ["CAN", "MEX", "GBR", "DEU"],
  DEU: ["FRA", "POL", "ITA", "NLD"],
  FRA: ["DEU", "ITA", "ESP", "GBR"],
  ITA: ["ESP", "FRA", "DEU", "GRC"],
  GBR: ["FRA", "DEU", "USA", "IRL"],
  DNK: ["SWE", "NOR", "DEU", "NLD"],
  NOR: ["SWE", "DNK", "FIN", "DEU"],
  SWE: ["NOR", "DNK", "FIN", "DEU"],
  NGA: ["GHA", "ETH", "KEN", "EGY"],
  EGY: ["ISR", "JOR", "SAU", "SDN"],
  LBN: ["ISR", "JOR", "SYR", "CYP"],
  HUN: ["AUT", "SVK", "ROU", "POL", "SRB"],
  POL: ["DEU", "CZE", "UKR", "SVK", "LTU"],
  ESP: ["PRT", "FRA", "ITA", "MAR"],
  BRA: ["ARG", "CHL", "COL", "MEX"],
  MEX: ["USA", "GTM", "COL", "BRA"],
  AUS: ["NZL", "JPN", "IDN", "KOR"],
  CAN: ["USA", "GBR", "FRA", "MEX"],
  RUS: ["UKR", "KAZ", "CHN", "DEU"],
  TUR: ["GRC", "IRN", "BGR", "SYR"],
  IDN: ["MYS", "PHL", "AUS", "VNM"],
  PAK: ["IND", "AFG", "IRN", "BGD"],
  IRN: ["TUR", "IRQ", "PAK", "AFG"],
  ARG: ["BRA", "CHL", "URY", "PRY"],
  ZAF: ["NAM", "BWA", "ZWE", "MOZ"],
};

const BY_CONTINENT: Record<string, string[]> = {
  "Middle East & North Africa": ["EGY", "TUR", "SAU", "IRN", "ISR"],
  Europe: ["DEU", "FRA", "ITA", "POL", "GBR"],
  "East Asia & Pacific": ["CHN", "JPN", "KOR", "AUS", "IDN"],
  "South Asia": ["IND", "PAK", "BGD", "LKA"],
  "Sub-Saharan Africa": ["NGA", "ETH", "KEN", "ZAF", "GHA"],
  "North America": ["USA", "CAN", "MEX"],
  "Latin America & Caribbean": ["BRA", "MEX", "COL", "ARG", "CHL"],
};

export function briefingPeerIso3s(iso3: string, continent?: string | null): string[] {
  const key = iso3.toUpperCase();
  const listed = BY_ISO3[key];
  const raw = listed ?? BY_CONTINENT[continent ?? ""] ?? [];
  return [...new Set(raw.filter((c) => c !== key))].slice(0, 6);
}

/** Fill a neighbor list so every country gets a bar chart, not only the curated set. */
export function pickPeerIso3s(
  prefer: string[],
  candidates: { iso3: string; tfr: number }[],
  selfTfr: number | null,
  limit = 5,
): string[] {
  const have = new Set(candidates.map((c) => c.iso3.toUpperCase()));
  const out: string[] = [];
  const add = (iso: string) => {
    const u = iso.toUpperCase();
    if (!have.has(u) || out.includes(u) || out.length >= limit) return;
    out.push(u);
  };
  for (const p of prefer) add(p);
  if (out.length >= 3) return out;

  const rest = candidates.filter((c) => !out.includes(c.iso3.toUpperCase()));
  const ranked =
    selfTfr == null
      ? rest
      : [...rest].sort(
          (a, b) => Math.abs(a.tfr - selfTfr) - Math.abs(b.tfr - selfTfr),
        );
  for (const c of ranked) add(c.iso3);
  return out;
}
