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
    "Demographic maps of vanished states: Ottoman millets, Russian Empire 1897 religions, Austria-Hungary and Kingdom of Hungary nationalities, German Empire faith, British India, Qing China, Yugoslavia, Greater Romania, and more.",
  alternates: { canonical: "/maps/historic" },
};

function MapCard({ m }: { m: HistoricMapEntry }) {
  return (
    <li className="border border-border bg-card p-5">
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
            m.status === "live"
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {m.status === "live" ? "Live" : "Coming"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {m.blurb}
      </p>
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
        Source:{" "}
        <a
          href={m.sourceUrl}
          className="link-editorial"
          target="_blank"
          rel="noreferrer"
        >
          {m.source}
        </a>
      </p>
    </li>
  );
}

export default function HistoricMapsHubPage() {
  const sections = historicMapsByRegion();

  return (
    <TopicShell
      title="Historic empire maps"
      description="Censuses and ethnographic surveys inside borders that no longer exist — Ottoman millets, Russian and German empires, Austria-Hungary, British India, Qing China, and successor kingdoms — same atlas style as our modern fertility maps."
      path="/maps/historic"
    >
      <section className="space-y-10">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Modern choropleths stop at today’s states. These layers dig through
          older statistical maps — vilayets, uyezds, kreise, megyék, districts —
          so you can see how faith, language and nationality were distributed
          when the Ottoman, Romanov, Habsburg and Hohenzollern empires still
          stood. Interactive polygons ship as each historic boundary file is
          matched; legends and sources are live now.
        </p>

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
          </Link>{" "}
          — including{" "}
          <Link href="/maps/irq" className="link-editorial">
            Iraq
          </Link>
          ,{" "}
          <Link href="/maps/mex" className="link-editorial">
            Mexico
          </Link>
          , and MENA.
        </p>
      </section>
    </TopicShell>
  );
}
