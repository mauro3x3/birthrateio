import Link from "next/link";
import type { TopicMeta } from "@/lib/topic-meta";
import { cn } from "@/lib/utils";

/** "Read next" rail so hub pages link outward instead of dead-ending. */
export function RelatedTopics({
  related,
  plain = false,
}: {
  related: TopicMeta["related"];
  plain?: boolean;
}) {
  if (related.length === 0) return null;

  return (
    <section
      aria-labelledby={plain ? undefined : "related-heading"}
      className={plain ? undefined : "border-t border-border pt-6"}
    >
      {!plain && (
        <h2
          id="related-heading"
          data-toc-skip
          className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          Related topics
        </h2>
      )}
      <ul className={cn("grid gap-x-8 gap-y-3 sm:grid-cols-2", !plain && "mt-3")}>
        {related.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="group block">
              <span className="font-serif text-[0.95rem] font-semibold text-primary group-hover:underline">
                {item.title}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                {item.note}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
