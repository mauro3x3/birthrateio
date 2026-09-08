"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canExportMp4,
  exportAnimation,
  type MediaFormat,
} from "@/lib/media-export";

const RES: Record<string, { label: string; width: number }> = {
  small: { label: "Small (640px)", width: 640 },
  medium: { label: "Medium (800px)", width: 800 },
  large: { label: "Large (1200px)", width: 1200 },
};

export type AxisScale = "fixed" | "fit";

export function PyramidExportDialog({
  open,
  onOpenChange,
  minYear,
  maxYear,
  fileBase,
  getNode,
  frameYears,
  applyFrameIndex,
  axisScale,
  onAxisScaleChange,
  onStart,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minYear: number;
  maxYear: number;
  fileBase: string;
  getNode: () => HTMLElement | null;
  /** Year for each playback frame, in order. */
  frameYears: number[];
  applyFrameIndex: (i: number) => Promise<void>;
  axisScale: AxisScale;
  onAxisScaleChange: (v: AxisScale) => void;
  onStart?: () => void;
  onDone?: () => void;
}) {
  const [format, setFormat] = React.useState<MediaFormat>("gif");
  const [startYear, setStartYear] = React.useState(minYear);
  const [endYear, setEndYear] = React.useState(maxYear);
  const [fps, setFps] = React.useState(11);
  const [yearStep, setYearStep] = React.useState(1);
  const [resolution, setResolution] = React.useState("medium");
  const [busy, setBusy] = React.useState(false);
  const [pct, setPct] = React.useState(0);
  const [mp4, setMp4] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMp4(canExportMp4());
  }, []);

  React.useEffect(() => {
    if (open) {
      setStartYear(minYear);
      setEndYear(maxYear);
      setError(null);
    }
  }, [open, minYear, maxYear]);

  const lo = Math.max(minYear, Math.min(startYear, endYear, maxYear));
  const hi = Math.min(maxYear, Math.max(startYear, endYear, minYear));
  const indices = React.useMemo(() => {
    const idxs: number[] = [];
    for (let i = 0; i < frameYears.length; i++) {
      const y = frameYears[i];
      if (y < lo || y > hi) continue;
      if ((y - lo) % yearStep !== 0 && y !== hi) continue;
      idxs.push(i);
    }
    if (idxs.length === 0 && frameYears.length) {
      const i = frameYears.findIndex((y) => y >= lo);
      if (i >= 0) idxs.push(i);
    }
    return idxs;
  }, [frameYears, lo, hi, yearStep]);

  const frameCount = indices.length;
  const seconds = frameCount / fps;
  const holdMs = Math.round(1000 / fps);

  async function render() {
    const node = getNode();
    if (!node || busy || frameCount < 2) return;
    setBusy(true);
    setPct(0);
    setError(null);
    onStart?.();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await exportAnimation({
        node,
        frameCount,
        renderFrame: (i) => applyFrameIndex(indices[i] ?? 0),
        format,
        holdMs,
        fileBase,
        maxWidth: RES[resolution]?.width ?? 800,
        onProgress: setPct,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Export failed", err);
      setError("Export failed. Try a shorter range or a smaller resolution.");
    } finally {
      setBusy(false);
      setPct(0);
      onDone?.();
    }
  }

  const formatLabel =
    format === "gif" ? "GIF" : format === "mp4" ? "MP4" : "WebM";

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent hideClose={busy} className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export animation</DialogTitle>
          <DialogDescription>
            Render a GIF or video of this pyramid. Fixed scale keeps years comparable.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pyr-format">Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as MediaFormat)}
              disabled={busy}
            >
              <SelectTrigger id="pyr-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gif">Animated GIF (.gif)</SelectItem>
                {mp4 && <SelectItem value="mp4">Video (MP4) · best quality</SelectItem>}
                <SelectItem value="webm">Video (WebM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pyr-scale">Axis scale</Label>
            <Select
              value={axisScale}
              onValueChange={(v) => onAxisScaleChange(v as AxisScale)}
              disabled={busy}
            >
              <SelectTrigger id="pyr-scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed (comparable across years)</SelectItem>
                <SelectItem value="fit">Fit each year (bars fill the frame)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pyr-start">Start year</Label>
              <Input
                id="pyr-start"
                type="number"
                min={minYear}
                max={maxYear}
                value={startYear}
                disabled={busy}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pyr-end">End year</Label>
              <Input
                id="pyr-end"
                type="number"
                min={minYear}
                max={maxYear}
                value={endYear}
                disabled={busy}
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pyr-fps">Speed</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {fps} fps
              </span>
            </div>
            <Slider
              id="pyr-fps"
              min={4}
              max={20}
              step={1}
              value={[fps]}
              disabled={busy}
              onValueChange={([v]) => setFps(v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pyr-step">Year step</Label>
              <Select
                value={String(yearStep)}
                onValueChange={(v) => setYearStep(Number(v))}
                disabled={busy}
              >
                <SelectTrigger id="pyr-step">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every year</SelectItem>
                  <SelectItem value="2">Every 2 years</SelectItem>
                  <SelectItem value="5">Every 5 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pyr-res">Resolution</Label>
              <Select
                value={resolution}
                onValueChange={setResolution}
                disabled={busy}
              >
                <SelectTrigger id="pyr-res">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {frameCount} frames ({lo}–{hi})
            {frameCount > 1
              ? `, about ${seconds.toFixed(1)}s of animation`
              : ""}
            {yearStep > 1 ? ` · one frame every ${yearStep} years` : ""}.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {busy ? (
            <Button type="button" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rendering {pct}%
            </Button>
          ) : (
            <Button
              type="button"
              onClick={render}
              disabled={frameCount < 2}
            >
              <Download className="h-4 w-4" />
              Render {formatLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
