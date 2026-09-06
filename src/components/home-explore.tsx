import Link from "next/link";
import { ExploreDestinationGrid } from "@/components/explore-destination-grid";
import { FEATURED_DESTINATIONS } from "@/lib/featured-destinations";

export function HomeExplore() {
  return (
    <section className="border-t border-white/10 bg-[hsl(210_20%_98%)]">
      <div className="container py-12 md:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Start here
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary md:text-3xl">
            Maps and explorers
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            The charts most people come here for — regional fertility maps,
            census maps, and the fertility decomposition — plus the rest of the
            catalogue.
          </p>
        </div>
        <ExploreDestinationGrid items={FEATURED_DESTINATIONS} />
        <p className="mt-6 text-sm text-muted-foreground">
          Or browse{" "}
          <Link href="/topics" className="link-editorial font-medium">
            all topics
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
