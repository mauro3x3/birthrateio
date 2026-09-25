import type { Metadata } from "next";
import Link from "next/link";
import { TopicShell } from "@/components/topic-shell";
import { STORY_CATALOG } from "@/lib/stories";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Stories — Animated demographic rankings",
  description:
    "Bar-chart races you can play and download as GIF or video: Europe’s foreign-born from Muslim-majority countries, population rankings, and more — built from official statistical sources.",
  alternates: { canonical: "/stories" },
};

export default function StoriesIndexPage() {
  return (
    <TopicShell
      title="Stories"
      path="/stories"
      description="Animated rankings you can watch and share — GIF or video, landscape, square, or portrait."
      intro={
        <>
          <p>
            These are bar-chart races: countries reorder as the years tick. Each
            story cites official or UN-compiled national statistics, with the
            caveats written on the frame so a download stays honest when it
            leaves the site.
          </p>
          <p>
            Start with Europe&apos;s residents born in Muslim-majority countries
            (UN DESA migrant stock), or Europe by total population through 2100
            (World Bank history + UN WPP medium). More races follow.
          </p>
        </>
      }
    >
      <ul className="grid gap-4 md:grid-cols-2">
        {STORY_CATALOG.map((s) => {
          const live = s.status === "live";
          const card = (
            <div className="flex h-full flex-col rounded-sm border border-border bg-card p-5 transition-colors hover:border-foreground/25">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {s.years}
                </p>
                <span
                  className={
                    live
                      ? "rounded-sm bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-background"
                      : "rounded-sm border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  }
                >
                  {live ? "Play" : "Soon"}
                </span>
              </div>
              <h2 className="mt-3 font-serif text-xl font-semibold tracking-tight text-primary">
                {s.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.subtitle}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">
                {s.blurb}
              </p>
              {live ? (
                <p className="mt-4 text-sm font-medium text-primary">
                  Open story →
                </p>
              ) : null}
            </div>
          );
          return (
            <li key={s.slug}>
              {live ? (
                <Link href={`/stories/${s.slug}`} className="block h-full">
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </TopicShell>
  );
}
