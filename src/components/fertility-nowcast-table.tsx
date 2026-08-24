"use client";

import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile, formatNumber, toCSV } from "@/lib/utils";

export type NowcastRow = {
  label: string;
  iso3: string | null;
  slug: string | null;
  countrySlug: string | null;
  flagEmoji: string | null;
  birthsPrior: number | null;
  birthsCurrent: number | null;
  changePct: number | null;
  months: number | null;
  tfr2015: number | null;
  tfr2020: number | null;
  tfr2024: number | null;
  tfr2025: number | null;
  tfr2026: number | null;
  lessReliable: boolean;
  flags: string | null;
};

type ExportRow = {
  country: string;
  iso3: string;
  births_2025: number | "";
  births_2026: number | "";
  change_pct: number | "";
  months: number | "";
  tfr_2015: number | "";
  tfr_2020: number | "";
  tfr_2024: number | "";
  tfr_2025: number | "";
  tfr_2026: number | "";
  less_reliable: string;
  flags: string;
};

const EXPORT_HEADERS: { key: keyof ExportRow; label: string }[] = [
  { key: "country", label: "Country" },
  { key: "iso3", label: "ISO3" },
  { key: "births_2025", label: "Births 2025" },
  { key: "births_2026", label: "Births 2026" },
  { key: "change_pct", label: "Change %" },
  { key: "months", label: "Months" },
  { key: "tfr_2015", label: "TFR 2015" },
  { key: "tfr_2020", label: "TFR 2020" },
  { key: "tfr_2024", label: "TFR 2024" },
  { key: "tfr_2025", label: "TFR 2025" },
  { key: "tfr_2026", label: "TFR 2026" },
  { key: "less_reliable", label: "Less reliable" },
  { key: "flags", label: "Flags" },
];

function toExportRows(rows: NowcastRow[]): ExportRow[] {
  return rows.map((r) => ({
    country: r.label,
    iso3: r.iso3 ?? "",
    births_2025: r.birthsPrior ?? "",
    births_2026: r.birthsCurrent ?? "",
    change_pct: r.changePct ?? "",
    months: r.months ?? "",
    tfr_2015: r.tfr2015 ?? "",
    tfr_2020: r.tfr2020 ?? "",
    tfr_2024: r.tfr2024 ?? "",
    tfr_2025: r.tfr2025 ?? "",
    tfr_2026: r.tfr2026 ?? "",
    less_reliable: r.lessReliable ? "yes" : "",
    flags: r.flags ?? "",
  }));
}

function tfrCell(v: number | null, dim = false) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const low = v < 1.5;
  const veryLow = v < 1.2;
  return (
    <span
      className={`tabular-nums ${
        veryLow
          ? "font-semibold text-red-700"
          : low
            ? "text-orange-700"
            : ""
      } ${dim ? "opacity-70" : ""}`}
    >
      {v.toFixed(2)}
    </span>
  );
}

export function FertilityNowcastTable({
  rows,
  compiledBy,
  compiledByUrl,
  sourceNote,
}: {
  rows: NowcastRow[];
  compiledBy: string;
  compiledByUrl?: string | null;
  sourceNote: string;
}) {
  const handleCsv = () => {
    if (!rows.length) return;
    // BOM so Excel opens UTF-8 country names correctly
    const csv = `\uFEFF${toCSV(toExportRows(rows), EXPORT_HEADERS)}`;
    downloadFile("fertility-nowcast-2026.csv", csv);
  };

  const handleExcel = async () => {
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(toExportRows(rows), {
      header: EXPORT_HEADERS.map((h) => h.key),
    });
    // Human-readable header row
    XLSX.utils.sheet_add_aoa(sheet, [EXPORT_HEADERS.map((h) => h.label)], {
      origin: "A1",
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Fertility nowcast");
    XLSX.writeFile(book, "fertility-nowcast-2026.xlsx");
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="fertility-nowcast"
            className="scroll-mt-24 text-xl font-semibold tracking-tight"
          >
            2026 fertility nowcast
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Provisional births (same months YoY) and total fertility rates for
            2015–2026, compiled from national statistical offices. World Bank
            annual series on country pages remain the long-run reference —
            these figures are the timely layer.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCsv}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExcel}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Country</th>
              <th className="px-3 py-2 font-medium text-right">Births ’25</th>
              <th className="px-3 py-2 font-medium text-right">Births ’26</th>
              <th className="px-3 py-2 font-medium text-right">Change</th>
              <th className="px-3 py-2 font-medium text-right">Mo</th>
              <th className="px-3 py-2 font-medium text-right">TFR ’15</th>
              <th className="px-3 py-2 font-medium text-right">’20</th>
              <th className="px-3 py-2 font-medium text-right">’24</th>
              <th className="px-3 py-2 font-medium text-right">’25</th>
              <th className="px-3 py-2 font-medium text-right">’26</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = r.countrySlug
                ? `/country/${r.countrySlug}`
                : r.slug
                  ? `/country/${r.slug}`
                  : null;
              const name = (
                <span className="inline-flex items-center gap-1.5">
                  {r.flagEmoji && <span className="text-base">{r.flagEmoji}</span>}
                  <span
                    className={
                      r.lessReliable ? "text-muted-foreground" : "font-medium"
                    }
                  >
                    {r.label}
                    {r.flags ? (
                      <sup className="ml-0.5 text-[10px]">{r.flags}</sup>
                    ) : null}
                  </span>
                </span>
              );
              return (
                <tr
                  key={`${r.label}-${r.iso3 ?? "x"}`}
                  className="border-b last:border-0 even:bg-muted/20"
                >
                  <td className="px-3 py-1.5">
                    {href ? (
                      <Link href={href} className="hover:text-primary">
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                    {r.birthsPrior != null
                      ? formatNumber(r.birthsPrior, 0)
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.birthsCurrent != null
                      ? formatNumber(r.birthsCurrent, 0)
                      : "—"}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums ${
                      r.changePct == null
                        ? "text-muted-foreground"
                        : r.changePct >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                    }`}
                  >
                    {r.changePct == null
                      ? "—"
                      : `${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                    {r.months ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">{tfrCell(r.tfr2015, true)}</td>
                  <td className="px-3 py-1.5 text-right">{tfrCell(r.tfr2020, true)}</td>
                  <td className="px-3 py-1.5 text-right">{tfrCell(r.tfr2024)}</td>
                  <td className="px-3 py-1.5 text-right">{tfrCell(r.tfr2025)}</td>
                  <td className="px-3 py-1.5 text-right">{tfrCell(r.tfr2026)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Sources: {sourceNote}. Compiled by{" "}
          {compiledByUrl ? (
            <a
              href={compiledByUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              @{compiledBy}
            </a>
          ) : (
            compiledBy
          )}
          . Change = % vs the same months one year earlier. Grey / muted names
          are less reliable (often subnational-based). Footnotes: * emigration
          correction · ** births abroad correction · ^ rolling 12-month · nn
          nationals only.
        </p>
      </div>
    </section>
  );
}
