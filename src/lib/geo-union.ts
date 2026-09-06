import type { Feature, Geometry } from "geojson";
import polygonClipping from "polygon-clipping";
import type { MultiPolygon, Polygon } from "polygon-clipping";

type Geom = Polygon | MultiPolygon;

function asGeom(geometry: Geometry | null): Geom | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return geometry.coordinates as Polygon;
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates as MultiPolygon;
  }
  return null;
}

/** Dissolve selected polygons into one feature (outer ring only, no internal seams). */
export function unionFeatures(features: Feature[]): Feature | null {
  const geoms: Geom[] = [];
  for (const feature of features) {
    const geom = asGeom(feature.geometry);
    if (geom && geom.length > 0) geoms.push(geom);
  }
  if (geoms.length === 0) return null;
  try {
    const merged = polygonClipping.union(geoms[0], ...geoms.slice(1));
    if (!merged.length) return null;
    const geometry: Geometry =
      merged.length === 1
        ? { type: "Polygon", coordinates: merged[0] }
        : { type: "MultiPolygon", coordinates: merged };
    return { type: "Feature", properties: {}, geometry };
  } catch {
    return null;
  }
}
