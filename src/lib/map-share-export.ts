/** Capture a map explorer frame as a PNG for social posts. */

export function mapShareUrl(iso3: string): string {
  return `birthrate.io/maps/${iso3.toLowerCase()}`;
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
}): Promise<void> {
  const { node, iso3, background } = opts;
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
    a.download = `birthrate-maps-${iso3.toLowerCase()}.png`;
    a.click();
  } finally {
    node.classList.remove("br-exporting");
  }
}
