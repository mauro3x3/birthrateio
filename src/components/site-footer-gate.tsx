"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";

/** Full-viewport surfaces hide the site footer so the page can fill the screen. */
const FULLSCREEN_PATHS = ["/", "/cities", "/population", "/fertility"];

export function SiteFooterGate() {
  const pathname = usePathname();
  if (FULLSCREEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <SiteFooter />;
}
