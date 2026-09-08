import { formatNumber } from "@/lib/utils";

export type Un2100 = {
  low?: number;
  medium?: number;
  high?: number;
};

function popWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)} billion`;
  }
  if (n >= 10_000_000) {
    return `${(n / 1_000_000).toFixed(0)} million`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} million`;
  }
  return formatNumber(Math.round(n), 0);
}

function pctChange(from: number, to: number): string {
  if (from <= 0) return "";
  const p = ((to - from) / from) * 100;
  const abs = Math.abs(p).toFixed(0);
  return p < 0 ? `${abs}% smaller` : `${abs}% larger`;
}

/** Short reading for the country pyramid — numbers only, no invented TFR. */
export function pyramidReading(opts: {
  country: string;
  startYear: number;
  startPop: number;
  endYear: number;
  endPop: number;
  tfr: number | null;
  un?: Un2100 | null;
  migrationHeldAtZero?: boolean;
}): { headline: string; body: string } {
  const start = popWords(opts.startPop);
  const end = popWords(opts.endPop);
  const change = pctChange(opts.startPop, opts.endPop);
  const tfr =
    opts.tfr != null && opts.tfr > 0 ? opts.tfr.toFixed(2) : null;
  const unMed = opts.un?.medium;
  const unLow = opts.un?.low;
  const unHigh = opts.un?.high;

  const headline =
    opts.endPop < opts.startPop
      ? `Held at ${tfr ? `a TFR of ${tfr}` : "today’s fertility"}, ${opts.country} falls from ${start} to about ${end} by ${opts.endYear}.`
      : `Held at ${tfr ? `a TFR of ${tfr}` : "today’s fertility"}, ${opts.country} goes from ${start} to about ${end} by ${opts.endYear}.`;

  const parts: string[] = [];
  parts.push(
    `That is ${change} than in ${opts.startYear}. The animation freezes the latest fertility rate${
      opts.migrationHeldAtZero
        ? " and holds net migration at 0 — recent flows are a short-run shock, not a century-long assumption"
        : ""
    }. It is a model, not an official forecast.`,
  );
  if (unMed != null) {
    const gap = opts.endPop < unMed
      ? `higher than this run`
      : `lower than this run`;
    parts.push(
      `UN World Population Prospects 2024 medium is ${popWords(unMed)} in ${opts.endYear} — ${gap}${
        unLow != null && unHigh != null
          ? ` (low ${popWords(unLow)}, high ${popWords(unHigh)})`
          : ""
      }. UN lets fertility change over the century and includes some migration; this run does not.`,
      );
  }

  return { headline, body: parts.join(" ") };
}

export function unProjectionReading(opts: {
  country: string;
  nowPop: number | null;
  nowYear: number | null;
  un?: Un2100 | null;
}): string | null {
  if (opts.un?.medium == null) return null;
  const now =
    opts.nowPop != null && opts.nowPop > 0 && opts.nowYear != null
      ? `${popWords(opts.nowPop)} in ${opts.nowYear}`
      : null;
  const med = popWords(opts.un.medium);
  const low = opts.un.low != null ? popWords(opts.un.low) : null;
  const high = opts.un.high != null ? popWords(opts.un.high) : null;
  const from = now ? `from ${now} to ` : "";
  const band =
    low && high ? ` Low is ${low}; high is ${high}.` : "";
  return `UN medium takes ${opts.country} ${from}${med} in 2100.${band}`;
}
