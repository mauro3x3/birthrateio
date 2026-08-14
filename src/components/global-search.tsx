"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SearchResults = {
  countries: {
    slug: string;
    name: string;
    flagEmoji: string | null;
    continent: string | null;
    href?: string;
    hint?: string | null;
  }[];
  cities: {
    slug: string;
    name: string;
    country: { name: string; flagEmoji: string | null };
  }[];
  regions: {
    slug: string;
    name: string;
    kind: string;
    country: { name: string; flagEmoji: string | null };
  }[];
  topics: {
    id: string;
    title: string;
    href: string;
    description?: string;
  }[];
};

export function GlobalSearch({
  className,
  variant = "compact",
}: {
  className?: string;
  variant?: "compact" | "header" | "hero";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>({
    countries: [],
    cities: [],
    regions: [],
    topics: [],
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults({ countries: [], cities: [], regions: [], topics: [] });
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults({
          countries: data.countries ?? [],
          cities: data.cities ?? [],
          regions: data.regions ?? [],
          topics: data.topics ?? [],
        });
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results.countries.length > 0 ||
    results.cities.length > 0 ||
    results.regions.length > 0 ||
    results.topics.length > 0;

  return (
    <>
      {variant === "hero" ? (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-sm border-0 bg-white px-4 py-3.5 text-left text-base text-foreground shadow-md transition-shadow hover:shadow-lg",
            className,
          )}
        >
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Try &ldquo;Japan fertility&rdquo;, &ldquo;Germany migration&rdquo;,
            &ldquo;Nigeria population&rdquo;&hellip;
          </span>
        </button>
      ) : variant === "header" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Search"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white",
            className,
          )}
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            className,
          )}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search countries, cities…</span>
          <span className="sm:hidden">Search…</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
            ⌘K
          </kbd>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0" hideClose>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Try Japan fertility, Germany migration…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {!loading && query.trim() && !hasResults && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {!query.trim() && (
                <CommandEmpty>Start typing to search…</CommandEmpty>
              )}
              {results.topics.length > 0 && (
                <CommandGroup heading="Topics">
                  {results.topics.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`topic-${t.id}`}
                      onSelect={() => go(t.href)}
                    >
                      <span>{t.title}</span>
                      {t.description && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {t.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.countries.length > 0 && (
                <CommandGroup heading="Countries">
                  {results.countries.map((c) => (
                    <CommandItem
                      key={c.slug}
                      value={`country-${c.slug}`}
                      onSelect={() => go(c.href ?? `/country/${c.slug}`)}
                    >
                      <span className="text-lg">{c.flagEmoji ?? "🏳️"}</span>
                      <span>{c.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.hint ?? c.continent}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.regions.length > 0 && (
                <CommandGroup heading="States & regions">
                  {results.regions.map((r) => (
                    <CommandItem
                      key={r.slug}
                      value={`region-${r.slug}`}
                      onSelect={() => go(`/state/${r.slug}`)}
                    >
                      <span className="text-lg">
                        {r.country.flagEmoji ?? "🗺️"}
                      </span>
                      <span>{r.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {r.country.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.cities.length > 0 && (
                <CommandGroup heading="Cities">
                  {results.cities.map((c) => (
                    <CommandItem
                      key={c.slug}
                      value={`city-${c.slug}`}
                      onSelect={() => go(`/city/${c.slug}`)}
                    >
                      <span className="text-lg">
                        {c.country.flagEmoji ?? "🏙️"}
                      </span>
                      <span>{c.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.country.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
