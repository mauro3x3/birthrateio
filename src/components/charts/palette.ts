// Chart colour palette tied to the CSS theme tokens so charts adapt to dark
// mode automatically (where SVG can read CSS vars) and have a stable fallback.
export const CHART_COLORS = [
  "hsl(221 83% 53%)",
  "hsl(142 71% 45%)",
  "hsl(25 95% 53%)",
  "hsl(280 65% 60%)",
  "hsl(340 82% 52%)",
  "hsl(190 90% 42%)",
  "hsl(48 96% 53%)",
  "hsl(0 72% 51%)",
];

export function colorAt(i: number) {
  return CHART_COLORS[i % CHART_COLORS.length];
}
