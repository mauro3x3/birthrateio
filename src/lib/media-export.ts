// Client-side animation export: turns a sequence of rendered DOM frames into a
// downloadable MP4 video (WebCodecs + mp4-muxer), a WebM video (MediaRecorder),
// or an animated GIF. Heavy deps (html-to-image, gifenc, mp4-muxer) are
// dynamically imported so they only load when a user actually exports.

export type MediaFormat = "mp4" | "webm" | "gif";

export interface ExportOptions {
  /** Element to snapshot each frame. */
  node: HTMLElement;
  /** Number of frames to render. */
  frameCount: number;
  /** Apply frame `i` to the UI and resolve once it has painted. */
  renderFrame: (i: number) => Promise<void>;
  format: MediaFormat;
  /** Milliseconds each frame is shown. */
  holdMs: number;
  /** Base filename (without extension). */
  fileBase: string;
  pixelRatio?: number;
  /** Cap output width (GIFs stay small/shareable). */
  maxWidth?: number;
  /** Progress 0–100. */
  onProgress?: (pct: number) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const even = (n: number) => (n % 2 === 0 ? n : n + 1);

export async function exportAnimation(opts: ExportOptions): Promise<void> {
  const { node, frameCount, renderFrame, format, holdMs, fileBase } = opts;
  // Capture at high resolution so text stays crisp when shared.
  const pixelRatio = opts.pixelRatio ?? (format === "gif" ? 2 : 2.5);

  const { toPng } = await import("html-to-image");
  const rect = node.getBoundingClientRect();
  const bg = getComputedStyle(node).backgroundColor || "#0b1120";

  let width = Math.round(rect.width * pixelRatio);
  let height = Math.round(rect.height * pixelRatio);
  // Cap for sanity (encoder levels / file size); GIFs use the smaller maxWidth.
  const cap = opts.maxWidth ?? 1600;
  if (width > cap) {
    const s = cap / width;
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  width = even(width);
  height = even(height);

  // Phase 1 — render each frame to an image (the slow part: ~60% of progress).
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < frameCount; i++) {
    await renderFrame(i);
    const dataUrl = await toPng(node, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: bg,
    });
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    images.push(img);
    opts.onProgress?.(Math.round(((i + 1) / frameCount) * 60));
  }

  if (format === "mp4") {
    const ok = await encodeMp4(
      images,
      width,
      height,
      bg,
      holdMs,
      fileBase,
      opts.onProgress,
    );
    if (!ok) {
      // WebCodecs/MP4 unsupported on this browser — fall back to WebM.
      await encodeWebm(images, width, height, bg, holdMs, fileBase, opts.onProgress);
    }
  } else if (format === "webm") {
    await encodeWebm(images, width, height, bg, holdMs, fileBase, opts.onProgress);
  } else {
    await encodeGif(images, width, height, bg, holdMs, fileBase, opts.onProgress);
  }
}

// Minimal WebCodecs typings accessed via the global, so we don't depend on the
// exact TS DOM-lib version shipping these definitions.
interface VideoEncoderLike {
  configure(config: Record<string, unknown>): void;
  encode(frame: unknown, options?: { keyFrame?: boolean }): void;
  flush(): Promise<void>;
}
interface VideoEncoderCtor {
  new (init: {
    output: (chunk: unknown, meta: unknown) => void;
    error: (e: unknown) => void;
  }): VideoEncoderLike;
  isConfigSupported(c: Record<string, unknown>): Promise<{ supported: boolean }>;
}
interface VideoFrameCtor {
  new (
    source: CanvasImageSource,
    init: { timestamp: number; duration?: number },
  ): { close(): void };
}

function webCodecs() {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    VideoEncoder?: VideoEncoderCtor;
    VideoFrame?: VideoFrameCtor;
  };
  if (!w.VideoEncoder || !w.VideoFrame) return null;
  return { VideoEncoder: w.VideoEncoder, VideoFrame: w.VideoFrame };
}

/** True when the browser can encode H.264 MP4 via WebCodecs. */
export function canExportMp4(): boolean {
  return webCodecs() !== null;
}

async function pickH264Codec(
  VE: VideoEncoderCtor,
  width: number,
  height: number,
) {
  const candidates = ["avc1.640028", "avc1.4d0028", "avc1.42E01E"];
  for (const codec of candidates) {
    try {
      const { supported } = await VE.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 10_000_000,
      });
      if (supported) return codec;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function encodeMp4(
  images: HTMLImageElement[],
  width: number,
  height: number,
  bg: string,
  holdMs: number,
  fileBase: string,
  onProgress?: (pct: number) => void,
): Promise<boolean> {
  const wc = webCodecs();
  if (!wc) return false;
  const codec = await pickH264Codec(wc.VideoEncoder, width, height);
  if (!codec) return false;

  try {
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const hold = Math.max(60, holdMs);
    const fps = Math.max(1, Math.min(30, Math.round(1000 / hold)));

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width, height },
      fastStart: "in-memory",
    });

    const encoder = new wc.VideoEncoder({
      output: (chunk, meta) =>
        muxer.addVideoChunk(chunk as never, meta as never),
      error: (e: unknown) => console.error("VideoEncoder error", e),
    });
    encoder.configure({
      codec,
      width,
      height,
      bitrate: 10_000_000,
      framerate: fps,
    });

    const usPerFrame = Math.round(hold * 1000); // microseconds
    for (let k = 0; k < images.length; k++) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(images[k], 0, 0, width, height);
      const frame = new wc.VideoFrame(canvas, {
        timestamp: k * usPerFrame,
        duration: usPerFrame,
      });
      encoder.encode(frame, { keyFrame: k % fps === 0 });
      frame.close();
      onProgress?.(60 + Math.round(((k + 1) / images.length) * 38));
      if (k % 4 === 0) await sleep(0);
    }

    await encoder.flush();
    muxer.finalize();
    onProgress?.(100);
    download(new Blob([target.buffer], { type: "video/mp4" }), `${fileBase}.mp4`);
    return true;
  } catch (err) {
    console.error("MP4 encode failed, will fall back", err);
    return false;
  }
}

async function encodeWebm(
  images: HTMLImageElement[],
  width: number,
  height: number,
  bg: string,
  holdMs: number,
  fileBase: string,
  onProgress?: (pct: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 12_000_000,
  });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((res) => {
    rec.onstop = () => res();
  });
  rec.start();

  const hold = Math.max(90, holdMs);
  for (let k = 0; k < images.length; k++) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(images[k], 0, 0, width, height);
    onProgress?.(60 + Math.round(((k + 1) / images.length) * 40));
    await sleep(hold);
  }
  await sleep(600); // linger on the final frame
  rec.stop();
  await stopped;

  download(new Blob(chunks, { type: "video/webm" }), `${fileBase}.webm`);
}

async function encodeGif(
  images: HTMLImageElement[],
  width: number,
  height: number,
  bg: string,
  holdMs: number,
  fileBase: string,
  onProgress?: (pct: number) => void,
) {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");

  const gif = GIFEncoder();
  const delay = Math.max(40, holdMs);
  for (let k = 0; k < images.length; k++) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(images[k], 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
    onProgress?.(60 + Math.round(((k + 1) / images.length) * 40));
    // Yield so the UI can paint the progress.
    if (k % 4 === 0) await sleep(0);
  }
  gif.finish();
  const bytes = gif.bytes();
  download(
    new Blob([bytes as unknown as BlobPart], { type: "image/gif" }),
    `${fileBase}.gif`,
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
