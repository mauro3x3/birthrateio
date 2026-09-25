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
  { id: "landscape", label: "Landscape", hint: "16:9 · YouTube", width: 960, height: 540 },
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
  const key = String(year);
  return pack.series.reduce((sum, s) => sum + (s.values[key] ?? 0), 0);
}
