import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeHero } from "@/components/home-hero";
import { MapCard } from "@/components/maps/map-card";
import { RankingTable } from "@/components/ranking-table";
import { ChangeList } from "@/components/change-list";
import { ReleaseList } from "@/components/release-list";
import {
  getDataStats,
  getFertilityChanges,
  getMapFrames,
  getRanking,
  getUpcomingReleases,
} from "@/lib/queries";
import { SLUG } from "@/lib/indicators";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export default async function HomePage() {
  const [
    stats,
    fertilityFrames,
    popGrowth,
    fertilityChanges,
    releases,
    biggestPop,
  ] = await Promise.all([
    safe(getDataStats(), { countries: 0, indicators: 0, values: 0, releases: 0 }),
    safe(getMapFrames(SLUG.fertility, { step: 1, maxFrames: 66 }), []),
    safe(getRanking(SLUG.populationGrowth, { order: "desc", limit: 10 }), []),
    safe(getFertilityChanges(10, 6), { increases: [], declines: [] }),
    safe(getUpcomingReleases(6), []),
    safe(getRanking(SLUG.population, { order: "desc", limit: 10 }), []),
  ]);

  return (
    <div>
      <HomeHero stats={stats} />

      <div className="container py-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-10">
            <MapCard
              title="Global fertility map"
              description="Total fertility rate (births per woman). Drag the timeline to watch change over time."
              source="World Bank"
              frames={fertilityFrames}
              unit="births/woman"
              decimals={2}
              scaleType="diverging"
              mid={2.1}
              height={520}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Largest fertility declines
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      last 10 years
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChangeList
                    items={fertilityChanges.declines}
                    direction="down"
                    decimals={2}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Largest fertility increases
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      last 10 years
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChangeList
                    items={fertilityChanges.increases}
                    direction="up"
                    decimals={2}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Population growth rankings
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link href="/population">
                    View all <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <RankingTable
                  rows={popGrowth}
                  unit="% annual"
                  decimals={2}
                  valueLabel="Growth"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Most populous countries
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link href="/population">
                    Population explorer <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <RankingTable rows={biggestPop} unit="people" decimals={0} />
              </CardContent>
            </Card>

            <section className="border-t pt-8">
              <h2 className="mb-4 font-serif text-xl font-semibold">
                Compare any countries
              </h2>
              <p className="mb-4 max-w-2xl text-muted-foreground">
                Overlay fertility, population, GDP and migration trends side by
                side.
              </p>
              <Button asChild>
                <Link href="/compare">
                  Open compare tool <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Upcoming releases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReleaseList items={releases} />
                <Button asChild variant="link" size="sm" className="mt-3 h-auto p-0">
                  <Link href="/calendar">
                    Full calendar <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-brand-donate/30 bg-brand-donate/5">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-serif text-base font-semibold">
                  Support our work
                </h2>
                <p className="text-sm text-muted-foreground">
                  birthrate.io is free for everyone. Donations help us keep data
                  current and the site running.
                </p>
                <Button asChild className="w-full bg-brand-donate hover:bg-brand-donate/90">
                  <Link href="/support">Donate</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
