"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { SectionHeading } from "@/components/section-heading";
import { HelpImproveData } from "@/components/help-improve-data";
import { useChartBrand } from "@/components/charts/chart-brand";
import { siteConfig } from "@/lib/site";
import { downloadFile, toCSV } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  description?: string;
  source?: string;
  /** Override context subject for this chart only. */
  subject?: string;
  /** Extra control beside the title (e.g. explainer). Omitted from PNG export. */
  titleExtra?: React.ReactNode;
  /** Rows used for the CSV export. */
  csvRows?: Record<string, unknown>[];
  csvName?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function csvPreamble(opts: {
  title: string;
  description?: string;
  source?: string;
  subject?: string;
  path?: string;
}) {
  const lines: string[] = [];
  if (opts.subject) lines.push(`# ${opts.subject}`);
  lines.push(`# ${opts.title}`);
  if (opts.description) {
    lines.push(`# ${opts.description.replace(/\s+/g, " ").trim()}`);
  }
  if (opts.source) lines.push(`# Source: ${opts.source}`);
  const site = opts.path ? `birthrate.io${opts.path}` : siteConfig.name;
  lines.push(`# ${site}`);
  return `${lines.join("\n")}\n`;
}

export function ChartCard({
  title,
  description,
  source,
  subject: subjectProp,
  titleExtra,
  csvRows,
  csvName = "chart-data",
  children,
  action,
}: ChartCardProps) {
  const brand = useChartBrand();
  const subject = subjectProp ?? brand.subject;
  const path = brand.path;
  const ref = React.useRef<HTMLDivElement>(null);

  const handlePng = React.useCallback(async () => {
    const node = ref.current;
    if (!node) return;
    node.classList.add("br-exporting");
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (el) => {
          if (!(el instanceof HTMLElement)) return true;
          return el.dataset.exportIgnore == null;
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${csvName}.png`;
      a.click();
    } finally {
      node.classList.remove("br-exporting");
    }
  }, [csvName]);

  const handleCsv = React.useCallback(() => {
    if (!csvRows || csvRows.length === 0) return;
    const body = toCSV(csvRows);
    downloadFile(
      `${csvName}.csv`,
      `${csvPreamble({ title, description, source, subject, path })}${body}`,
    );
  }, [csvRows, csvName, title, description, source, subject, path]);

  const shareUrl = path
    ? `birthrate.io${path}`
    : siteConfig.name;

  return (
    <section className="border-t border-border pt-5">
      <div ref={ref} className="br-chart-share bg-background px-0.5">
        <div className="br-share-masthead mb-3 flex items-baseline justify-between gap-3 border-b border-border/80 pb-2">
          <p className="br-share-subject min-w-0 truncate font-serif text-sm font-semibold tracking-tight text-primary md:text-base">
            {subject ?? siteConfig.name}
          </p>
          {subject ? (
            <p
              data-export-ignore
              className="br-share-site shrink-0 text-[0.7rem] font-medium text-muted-foreground"
            >
              {siteConfig.name}
            </p>
          ) : null}
        </div>
        <SectionHeading
          className="br-share-heading"
          title={
            titleExtra ? (
              <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>{title}</span>
                <span
                  data-export-ignore
                  className="inline-flex font-sans text-xs font-medium normal-case tracking-normal"
                >
                  {titleExtra}
                </span>
              </span>
            ) : (
              title
            )
          }
          description={description}
          actions={
            <div
              data-export-ignore
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
            >
              {action}
              {csvRows && csvRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleCsv}
                  className="link-editorial font-medium"
                >
                  Download CSV
                </button>
              )}
              <button
                type="button"
                onClick={handlePng}
                className="link-editorial font-medium"
              >
                Download PNG
              </button>
            </div>
          }
        />
        {children}
        <div className="br-share-footer mt-3 space-y-1">
          {source && (
            <p className="br-share-source text-xs text-muted-foreground">
              Source: {source}
            </p>
          )}
          <p className="br-share-url text-[0.7rem] text-muted-foreground/80">
            {shareUrl}
          </p>
        </div>
      </div>
      <div data-export-ignore className="mt-1.5">
        <HelpImproveData context={subject ? `${subject} — ${title}` : title} />
      </div>
    </section>
  );
}
