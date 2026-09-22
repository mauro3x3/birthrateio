"use client";

/** Tiny SVG donut for national composition panels. */
export function CompositionDonut({
  shares,
  groups,
  size = 132,
}: {
  shares: Record<string, number>;
  groups: { id: string; shortLabel: string; color?: string }[];
  size?: number;
}) {
  const slices = groups
    .map((g) => ({
      ...g,
      value: shares[g.id] ?? 0,
      color: g.color ?? "#94a3b8",
    }))
    .filter((s) => s.value > 0);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2;
  const ir = r * 0.55;
  let angle = -Math.PI / 2;
  const arcs: { d: string; color: string; id: string }[] = [];
  for (const s of slices) {
    const sweep = (s.value / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const x0 = r + r * Math.cos(a0);
    const y0 = r + r * Math.sin(a0);
    const x1 = r + r * Math.cos(a1);
    const y1 = r + r * Math.sin(a1);
    const xi0 = r + ir * Math.cos(a0);
    const yi0 = r + ir * Math.sin(a0);
    const xi1 = r + ir * Math.cos(a1);
    const yi1 = r + ir * Math.sin(a1);
    const large = sweep > Math.PI ? 1 : 0;
    const d = [
      `M ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi1} ${yi1}`,
      `A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0}`,
      "Z",
    ].join(" ");
    arcs.push({ d, color: s.color, id: s.id });
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block"
      aria-hidden
    >
      {arcs.map((a) => (
        <path key={a.id} d={a.d} fill={a.color} stroke="#fff" strokeWidth={1} />
      ))}
    </svg>
  );
}
