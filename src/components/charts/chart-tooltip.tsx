"use client";

import type { TooltipProps } from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

/** Shared Recharts tooltip props — hover-friendly, no click required. */
export const chartTooltipProps = {
  cursor: {
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: 1,
    strokeDasharray: "4 4",
  },
  wrapperStyle: {
    outline: "none",
    pointerEvents: "none" as const,
    zIndex: 50,
  },
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--popover-foreground))",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.12)",
  },
  isAnimationActive: false,
};

/** Multi-series tooltip — lists every country at the hovered year. */
export function MultiSeriesTooltip({
  active,
  payload,
  label,
  unit,
  decimals = 2,
}: TooltipProps<ValueType, NameType> & {
  unit?: string;
  decimals?: number;
}) {
  if (!active || !payload?.length) return null;

  const fmt = (v: number) =>
    v.toLocaleString("en-US", { maximumFractionDigits: decimals });

  return (
    <div
      className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md"
      style={{ pointerEvents: "none" }}
    >
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Year {label}
      </p>
      <ul className="space-y-1">
        {payload
          .filter((p) => p.value != null && !Number.isNaN(Number(p.value)))
          .sort((a, b) => Number(b.value) - Number(a.value))
          .map((p) => (
            <li key={String(p.dataKey)} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <span className="flex-1">{p.name}</span>
              <span className="font-medium tabular-nums">
                {fmt(Number(p.value))}
                {unit ? ` ${unit}` : ""}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
