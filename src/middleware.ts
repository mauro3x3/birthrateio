import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalPathname } from "@/lib/canonical-path";

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const { pathname } = url;
  if (pathname.startsWith("/ingest")) return NextResponse.next();

  const canonical = canonicalPathname(pathname);
  if (canonical === pathname) return NextResponse.next();

  url.pathname = canonical;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    // Keep trailing slashes on PostHog `/ingest/*`. Skip static assets.
    "/((?!_next/static|_next/image|ingest/|api/|favicon.ico|.*\\..*).*)",
  ],
};
