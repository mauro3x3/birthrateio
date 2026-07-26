import { colorAt } from "./palette";

export interface CompositionItem {
  name: string;
  value: number;
  color?: string;
}

/**
 * A single-snapshot composition view: a 100%-stacked horizontal bar plus a
 * two-column legend with percentages. Clean and print-friendly — good for
 * religion / latest-year ethnicity breakdowns.
 */
export function CompositionBar({ items }: { items: CompositionItem[] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No composition data available</p>
    );
  }
  const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
  const colored = items.map((it, i) => ({
    ...it,
    color: it.color ?? colorAt(i),
    pct: (it.value / total) * 100,
  }));

  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-md ring-1 ring-border">
        {colored.map((it) => (
          <div
            key={it.name}
            style={{ width: `${it.pct}%`, background: it.color }}
            title={`${it.name}: ${it.value.toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {colored.map((it) => (
          <li
            key={it.name}
            className="flex items-center gap-2 border-b border-dashed border-border/60 pb-1.5 text-sm"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: it.color }}
            />
            <span className="flex-1 truncate">{it.name}</span>
            <span className="font-medium tabular-nums">
              {it.value.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
