"use client";

import * as React from "react";
import { Check, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { colorAt } from "@/components/charts/palette";

export interface CountryOption {
  slug: string;
  name: string;
  flagEmoji: string | null;
}

export function CountryMultiSelect({
  options,
  selected,
  onChange,
  max = 8,
  colored = true,
}: {
  options: CountryOption[];
  selected: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
  /** Series-coloured chips (compare tool). Off = plain removable pills. */
  colored?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const bySlug = React.useMemo(
    () => new Map(options.map((o) => [o.slug, o])),
    [options],
  );

  const toggle = (slug: string) => {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < max) onChange([...selected, slug]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((slug, i) => {
        const c = bySlug.get(slug);
        if (!c) return null;
        return (
          <span
            key={slug}
            className={
              colored
                ? "inline-flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-1 text-sm"
                : "inline-flex items-center gap-1 rounded-full border border-border py-0.5 pl-1.5 pr-0.5 text-xs"
            }
            style={colored ? { borderColor: colorAt(i) } : undefined}
          >
            {colored && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorAt(i) }}
              />
            )}
            <span>{c.flagEmoji}</span>
            {c.name}
            <button
              onClick={() => toggle(slug)}
              className="rounded-full p-0.5 hover:bg-muted"
              aria-label={`Remove ${c.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {selected.length < max && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={colored ? undefined : "h-7 text-xs"}
            >
              <Plus className="h-4 w-4" /> Add country
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search countries…" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem
                      key={o.slug}
                      value={o.name}
                      onSelect={() => {
                        toggle(o.slug);
                      }}
                    >
                      <span>{o.flagEmoji ?? "🏳️"}</span>
                      <span className="flex-1">{o.name}</span>
                      {selected.includes(o.slug) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
