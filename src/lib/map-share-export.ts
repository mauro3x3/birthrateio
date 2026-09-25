/** Capture a map explorer frame as a PNG for social posts. */

export function mapShareUrl(iso3: string): string {
  return `birthrate.io/maps/${iso3.toLowerCase()}`;
}

export function demographicsShareUrl(slug: string): string {
  return `birthrate.io/demographics/${slug}`;
}

function skipExportNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  if (node.dataset.exportIgnore != null) return false;
  if (node.classList.contains("leaflet-control-container")) return false;
  if (node.id === "devtools-indicator") return false;
  return true;
}

/** html-to-image drops Leaflet overlay SVGs that only have CSS size. */
function pinLeafletSvgSize(root: HTMLElement) {
  root
    .querySelectorAll<SVGSVGElement>(".leaflet-overlay-pane svg")
    .forEach((svg) => {
      const box = svg.getBoundingClientRect();
      if (box.width > 0) svg.setAttribute("width", String(Math.round(box.width)));
      if (box.height > 0)
        svg.setAttribute("height", String(Math.round(box.height)));
    });
}

export async function downloadMapSharePng(opts: {
  node: HTMLElement;
  iso3: string;
  background: string;
  /** Filename slug (defaults to iso3). Use for demographics routes. */
  fileSlug?: string;
}): Promise<void> {
  const { node, iso3, background, fileSlug } = opts;
  node.classList.add("br-exporting");
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  window.dispatchEvent(new Event("br-map-export-fit"));
  // Leaflet refits into the tighter export frame before capture.
  await new Promise((r) => setTimeout(r, 700));
  pinLeafletSvgSize(node);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(node, {
      backgroundColor: background,
      pixelRatio: 2,
      cacheBust: true,
      filter: skipExportNode,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    const slug = (fileSlug ?? iso3).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    a.download = `birthrate-maps-${slug}.png`;
    a.click();
  } finally {
    node.classList.remove("br-exporting");
  }
}
