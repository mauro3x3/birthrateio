import { cn } from "@/lib/utils";

/** DST-style section title with hairline rule — use above charts, tables, maps. */
export function SectionHeading({
  id,
  title,
  tocLabel,
  description,
  meta,
  actions,
  className,
}: {
  /** Anchor target; also picked up by the in-page table of contents. */
  id?: string;
  title: React.ReactNode;
  /** Short label for the contents rail when the title is long. */
  tocLabel?: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("section-rule", className)}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id={id}
            data-toc-label={tocLabel}
            className="scroll-mt-24 font-serif text-xl font-semibold tracking-tight text-primary md:text-[1.35rem]"
          >
            {title}
          </h2>
          {meta ? (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
