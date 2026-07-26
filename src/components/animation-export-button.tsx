"use client";

import * as React from "react";
import { Download, Film, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canExportMp4,
  exportAnimation,
  type MediaFormat,
} from "@/lib/media-export";

export interface AnimationExportButtonProps {
  /** Returns the DOM node to snapshot (called at export time). */
  getNode: () => HTMLElement | null;
  /** Number of frames in the animation. */
  frameCount: number;
  /** Apply frame `i` and resolve once painted. */
  renderFrame: (i: number) => Promise<void>;
  /** Milliseconds per frame. */
  holdMs: number;
  /** Base filename (without extension). */
  fileBase: string;
  /** Runs before export (e.g. pause playback). */
  onStart?: () => void;
  /** Runs after export (success or failure). */
  onDone?: () => void;
  disabled?: boolean;
  maxGifWidth?: number;
}

export function AnimationExportButton({
  getNode,
  frameCount,
  renderFrame,
  holdMs,
  fileBase,
  onStart,
  onDone,
  disabled,
  maxGifWidth = 900,
}: AnimationExportButtonProps) {
  const [busy, setBusy] = React.useState(false);
  const [pct, setPct] = React.useState(0);
  const [mp4Supported, setMp4Supported] = React.useState(true);

  React.useEffect(() => {
    setMp4Supported(canExportMp4());
  }, []);

  async function run(format: MediaFormat) {
    const node = getNode();
    if (!node || busy) return;
    setBusy(true);
    setPct(0);
    onStart?.();
    try {
      await exportAnimation({
        node,
        frameCount,
        renderFrame,
        format,
        holdMs,
        fileBase,
        maxWidth: format === "gif" ? maxGifWidth : undefined,
        onProgress: setPct,
      });
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setBusy(false);
      setPct(0);
      onDone?.();
    }
  }

  if (busy) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Exporting {pct}%
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {mp4Supported && (
          <DropdownMenuItem onClick={() => run("mp4")}>
            <Film className="h-4 w-4" /> Video (MP4) · best quality
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => run("webm")}>
          <Film className="h-4 w-4" /> Video (WebM)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("gif")}>
          <ImageIcon className="h-4 w-4" /> Animated GIF · low quality
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
