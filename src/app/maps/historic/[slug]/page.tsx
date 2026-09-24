import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  HistoricMapExplorer,
  type HistoricMapPack,
} from "@/components/historic-map-explorer";
import {
  getHistoricMap,
  HISTORIC_MAPS,
} from "@/lib/sources/historic-maps-data";
import austriaHungary1910 from "@/lib/data/historic-austria-hungary-1910.json";
import russianEmpire1897 from "@/lib/data/historic-russian-empire-1897.json";

export const revalidate = 86400;

const PACKS: Record<string, HistoricMapPack> = {
  "austria-hungary-1910": austriaHungary1910 as unknown as HistoricMapPack,
  "russian-empire-1897": russianEmpire1897 as unknown as HistoricMapPack,
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return HISTORIC_MAPS.filter((m) => m.status === "live").map((m) => ({
    slug: m.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getHistoricMap(slug);
  if (!meta || meta.status !== "live") {
    return { title: "Historic map", robots: { index: false, follow: true } };
  }
  return {
    title: `${meta.title} — Historic map`,
    description: meta.blurb,
    alternates: { canonical: `/maps/historic/${meta.slug}` },
  };
}

export default async function HistoricMapPage({ params }: Props) {
  const { slug } = await params;
  const meta = getHistoricMap(slug);
  const pack = PACKS[slug];
  if (!meta || meta.status !== "live" || !pack) notFound();
  return <HistoricMapExplorer meta={meta} pack={pack} />;
}
