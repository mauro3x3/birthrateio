"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type CountryNavItem = {
  id: string;
  label: string;
};

/**
 * Sticky section switcher for country profiles.
 * Shows one thematic panel at a time instead of an endless chart scroll.
 * Panels are server-rendered siblings with `[data-country-panel]` + matching `id`.
 */
export function CountrySectionNav({ items }: { items: CountryNavItem[] }) {
  const [active, setActive] = React.useState(items[0]?.id ?? "overview");

  const showPanel = React.useCallback(
    (id: string) => {
      if (!items.some((i) => i.id === id)) return;
      setActive(id);
      for (const el of document.querySelectorAll<HTMLElement>(
        "[data-country-panel]",
      )) {
        el.hidden = el.id !== id;
      }
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, "", url.toString());
    },
    [items],
  );

  React.useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    // Legacy deep link: trade lives inside the Economy panel.
    const resolved =
      fromHash === "trade"
        ? "economy"
        : fromHash && items.some((i) => i.id === fromHash)
          ? fromHash
          : items[0]?.id;
    if (resolved) {
      showPanel(resolved);
      if (fromHash === "trade") {
        window.setTimeout(() => {
          document.getElementById("trade")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      }
    }

    const onHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (id === "trade") {
        showPanel("economy");
        window.setTimeout(() => {
          document.getElementById("trade")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
        return;
      }
      if (id && items.some((i) => i.id === id)) showPanel(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [items, showPanel]);

  if (items.length < 2) return null;

  return (
    <nav
      aria-label="Country sections"
      className="sticky top-[3.75rem] z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0 sm:px-0"
    >
      <div className="flex gap-0 overflow-x-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => showPanel(item.id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              active === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Server-friendly panel wrapper — first panel visible, others hidden until nav runs. */
export function CountryPanel({
  id,
  title,
  description,
  defaultVisible = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  defaultVisible?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-country-panel
      hidden={!defaultVisible}
      className="scroll-mt-28 space-y-6"
    >
      <div className="section-rule">
        <div className="min-w-0 space-y-1">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-primary md:text-[1.35rem]">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
