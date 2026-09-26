/**
 * Freshen compare series with BirthGauge national TFR / births so the
 * compare tab matches continental maps (World Bank alone lags 1–3 years).
 */
import birthgauge from "@/lib/data/birthgauge-2026.json";

type BgRow = (typeof birthgauge.rows)[number];

const bySlug = new Map<string, BgRow>();
const byIso3 = new Map<string, BgRow>();
for (const row of birthgauge.rows) {
  if (row.slug) bySlug.set(row.slug, row);
  if (row.iso3) byIso3.set(row.iso3, row);
}

export function birthgaugeForSlug(slug: string): BgRow | undefined {
  return bySlug.get(slug);
}

/** Prefer BirthGauge TFR from this year onward when overlaying WDI. */
export const BG_TFR_FROM_YEAR = 2024;

export function birthgaugeTfrByYear(slug: string): Map<number, number> {
  const row = bySlug.get(slug);
  const out = new Map<number, number>();
  if (!row?.tfr) return out;
  for (const [y, v] of Object.entries(row.tfr)) {
    const year = Number(y);
    if (!Number.isFinite(year) || v == null) continue;
    // Keep 2015/2020 as optional bridges only when WDI is missing those years;
    // always apply 2024+.
    if (year >= BG_TFR_FROM_YEAR) out.set(year, Number(v));
  }
  return out;
}

/** Absolute births from BirthGauge YTD tracker (recent years only). */
export function birthgaugeBirthsByYear(slug: string): Map<number, number> {
  const row = bySlug.get(slug);
  const out = new Map<number, number>();
  if (!row) return out;
  if (row.births2025 != null) out.set(2025, row.births2025);
  if (row.births2026 != null) out.set(2026, row.births2026);
  return out;
}

export const BIRTHGAUGE_SOURCE =
  "World Bank WDI through the latest published year; 2024+ TFR from BirthGauge (national statistical offices).";

export const BIRTHGAUGE_BIRTHS_SOURCE =
  "Live births ≈ population × crude birth rate / 1,000 (World Bank). Recent years use BirthGauge registered/provisional birth counts where published.";
