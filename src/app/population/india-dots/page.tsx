import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { PopulationDotsMapLazy } from "@/components/maps/population-dots-map-lazy";
import indiaPop from "@/lib/data/india-population-pmtiles.json";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "India population map — WorldPop dots",
  description:
    "Interactive MapLibre + PMTiles dot-density map of India from WorldPop 2025 1 km population grids. Modeled people per cell, randomized within pixels.",
  alternates: { canonical: "/population/india-dots" },
};

export default function IndiaPopulationDotsPage() {
  const tilesUrl =
    process.env.NEXT_PUBLIC_INDIA_POP_PMTILES_URL?.trim() ||
    indiaPop.pmtilesPath;

  return (
    <div className="container space-y-8 py-10">
      <PageHeader
        title={indiaPop.title}
        description={`WorldPop ${indiaPop.year} · ${indiaPop.resolution} cells · ~1 dot per ${indiaPop.peoplePerDot} people. Zoom in — tiles stream from a single PMTiles archive.`}
      />

      <div className="overflow-hidden border border-border bg-[hsl(215_40%_8%)]">
        <PopulationDotsMapLazy
          url={tilesUrl}
          layer={indiaPop.layer}
          bounds={indiaPop.bounds as [number, number, number, number]}
          minZoom={indiaPop.minZoom}
          maxZoom={indiaPop.maxZoom}
        />
      </div>

      <section className="max-w-2xl space-y-3">
        <SectionHeading
          title="What you are looking at"
          description={indiaPop.note}
        />
        <p className="text-sm text-muted-foreground">
          Built with the same idea as recent{" "}
          <span className="text-foreground">MapLibre + PMTiles + freestiler</span>{" "}
          population maps: stream a billion-scale point cloud without a tile
          server. This pilot uses the 1&nbsp;km product and 1:100 dots so the
          archive stays practical to host; a 100&nbsp;m / 1:1 rebuild is a
          longer offline job.
        </p>
        <p className="text-sm text-muted-foreground">
          Source:{" "}
          <a
            href={indiaPop.sourceUrl}
            className="link-editorial"
            target="_blank"
            rel="noopener noreferrer"
          >
            {indiaPop.source}
          </a>
          {" · "}
          <Link href="/population" className="link-editorial">
            Population explorer
          </Link>
          {" · "}
          <Link href="/maps/ind" className="link-editorial">
            India fertility map
          </Link>
        </p>
      </section>
    </div>
  );
}
