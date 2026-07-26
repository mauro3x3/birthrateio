"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Download, ImageDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-1">
          {action}
          {csvRows && csvRows.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCsv}
              aria-label="Download CSV"
              title="Download CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePng}
            aria-label="Download PNG"
            title="Download PNG"
          >
            <ImageDown className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="bg-card">
          {children}
        </div>
        {source && (
          <p className="mt-3 text-xs text-muted-foreground">Source: {source}</p>
        )}
      </CardContent>
    </Card>
  );
}
