import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import type { RelatedInsight } from "@/lib/search-insights";

/** Scannable "read next" list of specific charts, not just sibling hubs. */
export function RelatedInsights({
  items,
  heading = "Related insights",
}: {
  items: RelatedInsight[];
  heading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="related-insights">
      <SectionHeading
        id="related-insights"
        title={heading}
        description="Other charts and country pages on the same theme."
      />
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-center gap-3 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              <BarChart3
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1 font-serif font-medium text-primary group-hover:underline">
                {item.title}
              </span>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {item.region}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
