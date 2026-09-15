"use client";

import * as React from "react";

/**
 * Measures its own width and only mounts children once width is known.
 * Avoids Recharts ResponsiveContainer mounting at width 0 (blank forever)
 * when many charts hydrate in a grid at once.
 */
export function ChartFrame({
  height,
  className,
  children,
}: {
  height: number;
  className?: string;
  children: (width: number) => React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Late layout passes (fonts, grid) — one more tick after paint.
    const t = window.setTimeout(update, 0);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: "100%", minWidth: 0 }}>
      {width > 0 ? children(width) : <div style={{ height }} aria-hidden />}
    </div>
  );
}
