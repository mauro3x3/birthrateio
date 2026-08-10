"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { SectionHeading } from "@/components/section-heading";
import { downloadFile, toCSV } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  description?: string;
  source?: string;
  /** Rows used for the CSV export. */
  csvRows?: Record<string, unknown>[];
  csvName?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  source,
  csvRows,
  csvName = "chart-data",
  children,
  action,
}: ChartCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handlePng = React.useCallback(async () => {
    if (!ref.current) return;
    const bg = getComputedStyle(document.body).backgroundColor;
    const dataUrl = await toPng(ref.current, {
      backgroundColor: bg,
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${csvName}.png`;
    a.click();
  }, [csvName]);

  const handleCsv = React.useCallback(() => {
    if (!csvRows || csvRows.length === 0) return;
    downloadFile(`${csvName}.csv`, toCSV(csvRows));
  }, [csvRows, csvName]);

  return (
    <section className="border-t border-border pt-5">
      <SectionHeading
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
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
      <div ref={ref} className="bg-transparent">
        {children}
      </div>
      {source && (
        <p className="mt-3 text-xs text-muted-foreground">Source: {source}</p>
      )}
    </section>
  );
}
