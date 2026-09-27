"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "br-cookie-notice-dismissed";

/**
 * Lightweight cookie / advertising disclosure. Privacy policy is the full
 * legal text; this is the on-page signal AdSense and EU reviewers expect.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // private mode — still show
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm"
    >
      <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          We use essential cookies to run the site, analytics to understand
          usage, and — when ads are serving — Google AdSense for measurement.
          Details and choices:{" "}
          <Link href="/privacy" className="link-editorial font-medium">
            privacy policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
