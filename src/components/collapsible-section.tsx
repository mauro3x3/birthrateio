import { cn } from "@/lib/utils";

/** Collapsed-by-default prose block — keeps pages chart-first. */
export function CollapsibleSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group border-t border-border", className)}>
      <summary className="cursor-pointer list-none py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="text-xs transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          {title}
        </span>
      </summary>
      <div className="pb-6 pt-1">{children}</div>
    </details>
  );
}
