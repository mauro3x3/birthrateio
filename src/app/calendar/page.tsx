import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ReleaseList } from "@/components/release-list";
import { getAllReleases } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Data Release Calendar — Upcoming Demographic Data Releases",
  description:
    "Track upcoming data releases from the UN, World Bank, OECD and IMF: dates, datasets, sources and regions.",
  alternates: { canonical: "/calendar" },
};

export default async function CalendarPage() {
  const releases = await safe(getAllReleases(), []);

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
      <div className="container py-8">
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
