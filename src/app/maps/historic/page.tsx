import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import {
  historicMapsByRegion,
  type HistoricMapEntry,
} from "@/lib/sources/historic-maps-data";
import { cn } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Historic empire maps — Religion, nationality, and old borders",
  description:
    "Interactive Austria-Hungary nationalities & religion, Russian Empire 1897 religions, and planned Ottoman, German, British India district maps.",
  alternates: { canonical: "/maps/historic" },
};

function MapCard({ m }: { m: HistoricMapEntry }) {
  const live = m.status === "live";
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {m.empire} · {m.year}
          </p>
          <h3 className="mt-1 font-serif text-xl font-bold tracking-tight text-primary">
            {m.title}
          </h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-sm px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
            live
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {live ? "Live" : "Coming"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {m.blurb}
      </p>
      {!live && m.statusNote ? (
        <p className="mt-3 border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
          {m.statusNote}
        </p>
      ) : null}
      {m.groups && m.groups.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
          {m.groups.map((g) => (
            <li
              key={g.id}
              className="inline-flex items-center gap-1.5 text-xs text-foreground"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: g.color }}
                aria-hidden
              />
              {g.shortLabel}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-xs text-muted-foreground">
        {live ? (
          <span className="font-medium text-primary">Open interactive map →</span>
        ) : (
          <>
            Source:{" "}
            <a
              href={m.sourceUrl}
              className="link-editorial"
              target="_blank"
              rel="noreferrer"
            >
              {m.source}
            </a>
          </>
        )}
      </p>
    </>
  );

  if (live) {
    return (
      <li>
        <Link
          href={`/maps/historic/${m.slug}`}
          className="block border border-border bg-card p-5 transition-colors hover:border-foreground/30"
        >
          {inner}
        </Link>
      </li>
    );
  }

  return <li className="border border-border bg-card p-5 opacity-95">{inner}</li>;
}

export default function HistoricMapsHubPage() {
  const sections = historicMapsByRegion();
  const liveCount = sections.reduce(
    (n, s) => n + s.maps.filter((m) => m.status === "live").length,
    0,
  );

  return (
    <TopicShell
      title="Historic empire maps"
      description="Censuses and ethnographic surveys inside borders that no longer exist — Ottoman millets, Russian and German empires, Austria-Hungary, British India, Qing China, and successor kingdoms."
      path="/maps/historic"
    >
      <section className="space-y-10">
        <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            The cards marked <span className="font-medium text-foreground">Coming</span>{" "}
            are not broken links — they are a roadmap. Interactive district maps need
            historic administrative polygons (uyezds, vilayets, kreise, megyék) matched
            to period census tables. Using today’s oblasts or NUTS units would draw the
            wrong borders, so we did not fake them.
          </p>
          <p>
            {liveCount > 0 ? (
              <>
                Start with the live{" "}
                <Link
                  href="/maps/historic/austria-hungary-1910"
                  className="link-editorial font-medium"
                >
                  Austria-Hungary 1910 nationalities
                </Link>{" "}
                map — empire-scoped crownlands painted by census language
                majority. More Dual Monarchy detail and other empires follow as
                historic GIS is matched.
              </>
            ) : null}
          </p>
        </div>

        {sections.map(({ region, maps }) => (
          <div key={region}>
            <h2 className="font-serif text-lg font-bold tracking-tight text-primary">
              {region}
            </h2>
            <ul className="mt-3 grid gap-4 md:grid-cols-2">
              {maps.map((m) => (
                <MapCard key={m.id} m={m} />
              ))}
            </ul>
          </div>
        ))}

        <p className="text-sm text-muted-foreground">
          Looking for today’s fertility by province? See{" "}
          <Link href="/maps" className="link-editorial font-medium">
            regional maps
          </Link>
          .
        </p>
      </section>
    </TopicShell>
  );
}
