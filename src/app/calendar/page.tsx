import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ReleaseList } from "@/components/release-list";
import { getAllReleases } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Data Release Calendar — Upcoming Demographic Data Releases",
  description:
    "Track upcoming data releases from the UN, World Bank, OECD and IMF: dates, datasets, sources and regions. Watch for TFR and fertility updates.",
  alternates: { canonical: "/calendar" },
};

export default async function CalendarPage() {
  const releases = await safe(getAllReleases(), []);
  const now = Date.now();
  const upcomingFertility = releases.filter(
    (r) =>
      r.category === "FERTILITY" &&
      new Date(r.releaseDate).getTime() >= now - 24 * 60 * 60 * 1000,
  );

  // Group by month.
  const groups = new Map<string, typeof releases>();
  for (const r of releases) {
    const key = new Date(r.releaseDate).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  return (
    <div>
      <PageHeader
        title="Data Release Calendar"
        description="Upcoming releases from the UN Population Division, World Bank, OECD and IMF. Plan your research and reporting around fresh data."
      />
      <div className="container space-y-6 py-8">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Fertility / TFR releases are marked with a{" "}
          <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-rose-600">
            fertility
          </span>{" "}
          badge below. Spot a new official figure not on this list?{" "}
          <Link
            href="/contribute"
            className="text-primary underline-offset-2 hover:underline"
          >
            Tip us on Contribute
          </Link>
          .
        </p>

        {upcomingFertility.length > 0 && (
          <Card className="border-[hsl(340_50%_88%)] bg-[hsl(340_60%_98%)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Upcoming TFR &amp; fertility releases
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                National and international fertility updates worth watching.
              </p>
            </CardHeader>
            <CardContent>
              <ReleaseList items={upcomingFertility} />
            </CardContent>
          </Card>
        )}

        {groups.size === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No releases scheduled. Run <code>npm run ingest</code> to populate
              the calendar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Array.from(groups.entries()).map(([month, items]) => (
              <Card key={month}>
                <CardHeader>
                  <CardTitle className="text-base">{month}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReleaseList items={items} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
