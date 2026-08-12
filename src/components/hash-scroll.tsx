"use client";

import * as React from "react";

/** Scroll to URL hash after mount (Next.js often skips this on soft navigation). */
export function HashScroll({ retries = 12 }: { retries?: number }) {
  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    let n = 0;
    let timer = 0;
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      n += 1;
      if (n < retries) timer = window.setTimeout(tryScroll, 120);
    };
    tryScroll();
    return () => window.clearTimeout(timer);
  }, [retries]);

  return null;
}
