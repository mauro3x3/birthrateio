"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

function citationText({
  title,
  path,
  sources,
  accessed,
}: {
  title: string;
  path: string;
  sources: string[];
  accessed: string;
}) {
  const url = `${siteConfig.url}${path}`;
  const underlying = sources.length
    ? ` Underlying data: ${sources.join("; ")}.`
    : "";
  return `${siteConfig.name}, "${title}". ${url} (accessed ${accessed}).${underlying}`;
}

/**
 * Citation block for topic and entity pages. Gives a reader something concrete
 * to paste, and makes the distinction between this site and the underlying
 * statistical agency explicit.
 */
export function CiteThis({
  title,
  path,
  sources = [],
  plain = false,
}: {
  title: string;
  path: string;
  sources?: string[];
  plain?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  // Rendered on the client so the access date reflects the reader's visit.
  const accessed = React.useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const text = citationText({ title, path, sources, accessed });

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [text]);

  return (
    <section
      aria-labelledby={plain ? undefined : "cite-heading"}
      className={plain ? undefined : "border-t border-border pt-6"}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        {!plain && (
          <h2
            id="cite-heading"
            data-toc-skip
            className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Cite this page
          </h2>
        )}
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy citation"}
        </Button>
      </div>
      <p className={cn("max-w-3xl text-sm leading-relaxed text-muted-foreground", plain ? "mt-0" : "mt-3")}>
        {text}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Please cite the original statistical agency for the underlying figures.
        Charts and tables on this page may be reused with attribution.
      </p>
    </section>
  );
}
