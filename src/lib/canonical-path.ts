import { resolveCountrySlug } from "@/lib/country-aliases";

const COUNTRY_HUBS = new Set([
  "country",
  "fertility",
  "population",
  "migration",
  "mortality",
  "gdp",
]);

/**
 * One-hop canonical pathname: strip trailing slashes, resolve country aliases,
 * and sort compare pairs. PostHog `/ingest/*` is left alone by the caller.
 */
export function canonicalPathname(pathname: string): string {
  let path = pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.replace(/\/+$/, "") || "/";
  }

  const parts = path.split("/").filter(Boolean);
  if (path === "/tips") {
    path = "/contribute";
  } else if (parts.length === 2 && COUNTRY_HUBS.has(parts[0])) {
    path = `/${parts[0]}/${resolveCountrySlug(parts[1])}`;
  } else if (parts.length === 3 && parts[0] === "compare") {
    const a = resolveCountrySlug(parts[1]);
    const b = resolveCountrySlug(parts[2]);
    if (a !== b) {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      path = `/compare/${lo}/${hi}`;
    }
  }

  return path;
}
