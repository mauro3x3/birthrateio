import polaniPack from "@/lib/data/europe-immigrant-fiscal-breakeven.json";
import oecdPack from "@/lib/data/oecd-immigrant-fiscal-impact.json";

export const EUROPE_IMMIGRANT_FISCAL = polaniPack;
export const OECD_IMMIGRANT_FISCAL = oecdPack;

const POLANI_BY_ISO3: Record<
  string,
  (typeof polaniPack.breakEven)[number] & { seriesKey: string }
> = {
  DEU: { ...polaniPack.breakEven.find((r) => r.country === "Germany")!, seriesKey: "Germany" },
  ESP: { ...polaniPack.breakEven.find((r) => r.country === "Spain")!, seriesKey: "Spain" },
  FRA: { ...polaniPack.breakEven.find((r) => r.country === "France")!, seriesKey: "France" },
  GBR: { ...polaniPack.breakEven.find((r) => r.country === "UK")!, seriesKey: "UK" },
};

const OECD_BY_ISO3 = new Map(
  oecdPack.countries.map((c) => [c.iso3, c] as const),
);

export type OecdImmigrantFiscalRow = (typeof oecdPack.countries)[number];

export function getOecdImmigrantFiscal(
  iso3: string,
): OecdImmigrantFiscalRow | null {
  return OECD_BY_ISO3.get(iso3.toUpperCase()) ?? null;
}

export function getPolaniBreakeven(iso3: string): {
  country: string;
  percentile: number;
  note?: string;
  seriesKey: string;
} | null {
  return POLANI_BY_ISO3[iso3.toUpperCase()] ?? null;
}

/** Prose + citation for country briefs (OECD + optional Polani break-even). */
export function migrationFiscalNoteForCountry(iso3: string): {
  note: string;
  source: string;
  sourceUrl: string;
} | null {
  const code = iso3.toUpperCase();
  const oecd = getOecdImmigrantFiscal(code);
  const polani = getPolaniBreakeven(code);

  if (!oecd && !polani) return null;

  const parts: string[] = [];
  if (oecd) {
    const sign = oecd.foreignC2 >= 0 ? "positive" : "negative";
    parts.push(
      `OECD International Migration Outlook 2021 (2006–18 average): foreign-born net fiscal contribution was ${oecd.foreignA.toFixed(2)}% of GDP on individual tax/benefit items alone (Spec A — positive in every country in the OECD table), and ${oecd.foreignC2.toFixed(2)}% of GDP once congestible and pure public goods are included (Spec C2, ${sign}). Native-born Spec C2 was ${oecd.nativeC2.toFixed(2)}% of GDP. Totals are small relative to GDP; age and employment drive most of the cross-country pattern.`,
    );
  }
  if (polani) {
    parts.push(
      `Polani (2026) lifetime accounting for a couple arriving at 30 with two children: in ${polani.country}, the main earner needs about the ${polani.percentile}th pay percentile for the household’s 60-year fiscal balance to break even — vs 30th in Germany, 37th in Spain, 47th in France, and 55th in the UK (same cohort; differences isolate the fiscal system).`,
    );
  }
  parts.push("See /migration/fiscal-balance for charts.");

  const source = [
    oecd ? oecdPack.source : null,
    polani
      ? "Usama Polani, Migration, Household Employment & Europe’s Public Finances (2026)"
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    note: parts.join(" "),
    source,
    sourceUrl: oecd ? oecdPack.sourceUrl : polaniPack.sourceUrl,
  };
}
