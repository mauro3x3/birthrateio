import type { SourceRef } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** Sources behind a page, with licence terms. Rendered near the page footer. */
export function SourceList({
  sources,
  plain = false,
}: {
  sources: readonly SourceRef[];
  plain?: boolean;
}) {
  if (sources.length === 0) return null;

  return (
    <section
      aria-labelledby={plain ? undefined : "sources-heading"}
      className={plain ? undefined : "border-t border-border pt-6"}
    >
      {!plain && (
        <h2
          id="sources-heading"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          Sources
        </h2>
      )}
      <ul className={cn("space-y-2.5", !plain && "mt-3")}>
        {sources.map((source) => (
          <li key={source.code} className="text-sm leading-relaxed">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-editorial font-medium"
              >
                {source.name}
              </a>
            ) : (
              <span className="font-medium text-foreground">{source.name}</span>
            )}
            <span className="text-muted-foreground">
              {" "}
              — {source.description}
              {source.license ? ` Licence: ${source.license}.` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
