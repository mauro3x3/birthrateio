import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1234567 -> "1.2M" */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return COMPACT.format(value);
}

/** Format with fixed decimals and thousands separators. */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a value using an indicator's unit for sensible display. */
export function formatByUnit(
  value: number | null | undefined,
  unit?: string | null,
  decimals = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (!unit) return formatNumber(value, decimals);
  const u = unit.toLowerCase();
  if (u.includes("us$") || u.includes("usd") || u.includes("$")) {
    return "$" + formatCompact(value);
  }
  if (u.includes("people") || u.includes("person") || u.includes("count")) {
    return formatCompact(value);
  }
  if (u.includes("%") || u.includes("percent")) {
    return formatNumber(value, 1) + "%";
  }
  return formatNumber(value, decimals);
}

export function formatPercentChange(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** Stable slug from a free-text name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Convert an array of records into a CSV string. */
export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  headers?: { key: keyof T; label: string }[],
): string {
  if (rows.length === 0) return "";
  const cols =
    headers ??
    Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k }));
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => cols.map((c) => escape(row[c.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

/** Trigger a browser download for a text blob. */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8;",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
