/** Curated animated ranking stories (bar-chart races) for social export. */

import europeMuslimOrigins from "@/lib/data/stories/europe-muslim-majority-origins.json";
import europePopulation from "@/lib/data/stories/europe-population.json";

export type StorySeries = {
  id: string;
  iso3: string;
  name: string;
  flag: string;
  color: string;
  values: Record<string, number>;
};

export type StoryPack = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  metricLabel: string;
  metricKind: "count" | "share";
  unit: string;
  decimals: number;
  topN: number;
  years: number[];
  note: string;
  source: string;
  sourceUrl: string;
  sidebarTitle: string;
  series: StorySeries[];
};

export type StoryMeta = {
  slug: string;
  title: string;
  subtitle: string;
  blurb: string;
  status: "live" | "soon";
  years: string;
};

export const STORY_PACKS: Record<string, StoryPack> = {
  "europe-muslim-majority-origins":
    europeMuslimOrigins as unknown as StoryPack,
  "europe-population": europePopulation as unknown as StoryPack,
};

export const STORY_CATALOG: StoryMeta[] = [
  {
    slug: "europe-muslim-majority-origins",
    title: "Born in Muslim-majority countries — Europe",
    subtitle: "Foreign-born stock, 1990–2024",
    blurb:
      "Watch France, Germany, the UK and neighbours reorder as residents born in Muslim-majority countries grow — UN DESA migrant stock from national statistical offices, not a religion census.",
    status: "live",
    years: "1990–2024",
  },
  {
    slug: "europe-population",
    title: "Europe by population",
    subtitle: "Total residents, 1960–2100",
    blurb:
      "Country rankings for total population from World Bank history through UN WPP 2024 medium projections — Russia, Germany, and the rest of Europe over decades.",
    status: "live",
    years: "1960–2100",
  },
];

export function getStoryPack(slug: string): StoryPack | undefined {
  return STORY_PACKS[slug];
}

export function getStoryMeta(slug: string): StoryMeta | undefined {
  return STORY_CATALOG.find((s) => s.slug === slug);
}

export type AspectId = "landscape" | "square" | "portrait";

export const ASPECTS: {
  id: AspectId;
  label: string;
  hint: string;
  width: number;
  height: number;
}[] = [
  // Taller than classic 16:9 so 15 ranked bars fit under the title without overlap.
  { id: "landscape", label: "Landscape", hint: "16:9 · YouTube", width: 1280, height: 720 },
  { id: "square", label: "Square", hint: "1:1 · feed", width: 720, height: 720 },
  { id: "portrait", label: "Portrait", hint: "9:16 · Reels", width: 540, height: 960 },
];

export function rankingForYear(
  pack: StoryPack,
  year: number,
  topN = pack.topN,
): { series: StorySeries; value: number }[] {
  const key = String(year);
  return pack.series
    .map((s) => ({ series: s, value: s.values[key] ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

export function totalForYear(pack: StoryPack, year: number): number {
  // Match the on-screen race: sum the ranked bars, not every series in the pack.
  return rankingForYear(pack, year).reduce((sum, r) => sum + r.value, 0);
}

/** Linear interpolate sparse source years (decades / 5-yr stocks) to every calendar year. */
export function densifyStoryPackAnnual(pack: StoryPack): StoryPack {
  const anchors = [...pack.years].sort((a, b) => a - b);
  if (anchors.length < 2) return pack;

  const years: number[] = [];
  for (let y = anchors[0]; y <= anchors[anchors.length - 1]; y++) years.push(y);
  // Already annual — leave values alone.
  if (years.length === anchors.length) return pack;

  const series = pack.series.map((s) => {
    const values: Record<string, number> = {};
    for (const y of years) {
      const exact = s.values[String(y)];
      if (exact != null && Number.isFinite(exact)) {
        values[String(y)] = exact;
        continue;
      }
      let lo = anchors[0];
      let hi = anchors[anchors.length - 1];
      for (let i = 0; i < anchors.length - 1; i++) {
        if (y >= anchors[i] && y <= anchors[i + 1]) {
          lo = anchors[i];
          hi = anchors[i + 1];
          break;
        }
      }
      const a = s.values[String(lo)];
      const b = s.values[String(hi)];
      if (a == null && b == null) continue;
      if (a == null) {
        values[String(y)] = Math.round(b!);
        continue;
      }
      if (b == null) {
        values[String(y)] = Math.round(a);
        continue;
      }
      const t = hi === lo ? 0 : (y - lo) / (hi - lo);
      values[String(y)] = Math.round(a + (b - a) * t);
    }
    return { ...s, values };
  });

  return { ...pack, years, series };
}
