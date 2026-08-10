import type { PathOptions } from "leaflet";

/** Shared ocean / stage colours for choropleth maps. */
export const MAP_OCEAN = {
  cinema: "#0a0a0a",
  light: "#e8eee8",
  soft: "hsl(40 22% 94%)",
} as const;

/**
 * Polished country borders — dark hairlines that read as seams, not fences.
 * Fill-matched strokes anti-alias into light speckles (esp. Firefox); avoid them.
 */
export function countryBorderStyle(
  kind: "cinema" | "light" = "cinema",
): Pick<PathOptions, "stroke" | "color" | "weight" | "opacity" | "lineJoin" | "lineCap"> {
  if (kind === "cinema") {
    return {
      stroke: true,
      // Near-black, slightly warm — disappears into the ocean at coasts,
      // separates same-tone neighbours without white cracks.
      color: "rgba(0, 0, 0, 0.72)",
      weight: 0.85,
      opacity: 1,
      lineJoin: "round",
      lineCap: "round",
    };
  }
  // Light maps (US demographics etc.): soft white seams on choropleth fills
  // (Census-style), not dark fences.
  return {
    stroke: true,
    color: "rgba(255, 255, 255, 0.9)",
    weight: 0.85,
    opacity: 1,
    lineJoin: "round",
    lineCap: "round",
  };
}

export function countryHoverBorder(
  kind: "cinema" | "light" = "cinema",
): Pick<PathOptions, "weight" | "color" | "fillOpacity"> {
  if (kind === "cinema") {
    return {
      weight: 1.4,
      color: "rgba(255, 255, 255, 0.32)",
      fillOpacity: 1,
    };
  }
  return {
    weight: 1.5,
    color: "rgba(18, 28, 38, 0.55)",
    fillOpacity: 1,
  };
}
