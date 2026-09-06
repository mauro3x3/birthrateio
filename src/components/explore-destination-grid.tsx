import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeaturedDestination } from "@/lib/featured-destinations";
import { cn } from "@/lib/utils";

export function ExploreDestinationGrid({
  items,
  className,
}: {
  items: FeaturedDestination[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="bg-background">
          <Link
            href={item.href}
            className="group flex h-full flex-col px-4 py-5 sm:px-5"
          >
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {item.kicker}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 font-serif text-lg font-semibold text-primary">
              <span className="group-hover:underline">{item.title}</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
