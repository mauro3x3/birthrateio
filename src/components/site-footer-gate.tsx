"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";

/** Full-viewport surfaces hide the site footer so the page can fill the screen. */
const FULLSCREEN_PATHS = [
  "/cities",
  "/population",
  "/fertility",
  "/gdp",
  "/demographics/uk",
  "/maps",
];

export function SiteFooterGate() {
  const pathname = usePathname();
  const censusMap =
    pathname.startsWith("/demographics/") && pathname !== "/demographics";
  const populationShares = pathname.startsWith("/population/shares");
  if (
    !populationShares &&
    (censusMap ||
      FULLSCREEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
  ) {
    return null;
  }
  return <SiteFooter />;
}
