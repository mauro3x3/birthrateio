import type { Metadata } from "next";
import { TopicsLinkGrid, TopicsSidebar } from "@/components/topics-nav";
import { navTopics } from "@/lib/site";

export const metadata: Metadata = {
  title: "Topics — Browse demographic statistics",
  description:
    "Browse fertility, population, migration, mortality, crime, GDP, cities, and tools — organized by subject like a statistical yearbook.",
  alternates: { canonical: "/topics" },
};

export default function TopicsPage() {
  return (
    <div className="border-b border-border bg-[hsl(210_20%_98%)]">
      <div className="container py-8 md:py-10">
        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TopicsSidebar defaultOpenId="people" />
          </aside>

          <div>
            <header className="mb-10 max-w-2xl">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-primary md:text-4xl">
                Topics
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Statistics by subject — every explorer, map, and tool on
                birthrate.io, grouped the way national statistical offices
                organize their catalogues.
              </p>
            </header>

            <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-12 xl:gap-y-14">
              {navTopics.map((topic) => (
                <TopicsLinkGrid key={topic.id} topic={topic} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
