"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string };

function scan(containerId: string): Heading[] {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLHeadingElement>("h2[id]"))
    .filter((el) => !el.hasAttribute("data-toc-skip"))
    .map((el) => ({
      id: el.id,
      text: (el.dataset.tocLabel ?? el.textContent ?? "").trim(),
    }))
    .filter((h) => h.id && h.text);
}

/**
 * In-page contents built by scanning the rendered article for `h2[id]`, so a
 * page only has to give its section headings ids. The sidebar can hydrate
 * before the streamed article body exists, so keep watching the DOM until
 * headings show up.
 */
export function TableOfContents({ containerId }: { containerId: string }) {
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [active, setActive] = React.useState<string | null>(null);

  React.useEffect(() => {
    const found = scan(containerId);
    if (found.length > 0) {
      setHeadings(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const next = scan(containerId);
      if (next.length > 0) {
        setHeadings(next);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerId]);

  React.useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Offset for the sticky header so the active item flips at the right time.
      { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="space-y-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "-ml-px block border-l py-1 pl-3 text-sm leading-snug transition-colors",
                active === heading.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
