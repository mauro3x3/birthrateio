import type { AssistantChartSpec } from "@/components/assistant-chart";
import type { BriefingChartId, BriefingPlaceAfter } from "@/lib/briefing-modules";
import { BRIEFING_CHARTS } from "@/lib/briefing-modules";
import type { BriefingFacts } from "@/lib/briefing-facts";

function lineChart(
  id: BriefingChartId,
  after: BriefingPlaceAfter,
  title: string,
  subtitle: string,
  points: { year: number; value: number }[],
  seriesKey: string,
  seriesLabel: string,
  unit: string,
  note: string,
): AssistantChartSpec | null {
  if (points.length < 2) return null;
  return {
    id,
    after,
    type: "line",
    title,
    subtitle,
    xKey: "year",
    series: [{ key: seriesKey, label: seriesLabel }],
    data: points.map((p) => ({ year: String(p.year), [seriesKey]: p.value })),
    unit,
    note,
  };
}

export function briefingChartsFromFacts(
  facts: BriefingFacts,
  chartIds: BriefingChartId[],
  placement?: Partial<Record<BriefingChartId, BriefingPlaceAfter>>,
): AssistantChartSpec[] {
  const out: AssistantChartSpec[] = [];
  const want = new Set(chartIds);
  const afterOf = (id: BriefingChartId): BriefingPlaceAfter =>
    placement?.[id] ??
    BRIEFING_CHARTS.find((c) => c.id === id)?.defaultAfter ??
    "top";

  if (want.has("neighbors") && facts.neighbors.length >= 2) {
    out.push({
      id: "neighbors",
      after: afterOf("neighbors"),
      type: "bar",
      title: `Children per woman, ${facts.name} and neighbors`,
      subtitle: "Latest period TFR",
      xKey: "name",
      series: [{ key: "tfr", label: "TFR" }],
      data: facts.neighbors.map((n) => ({
        name: n.name,
        tfr: n.tfr,
      })),
      unit: "children per woman",
      note: "World Bank WDI period TFR. Not a forecast of completed family size.",
    });
  }

  if (want.has("tfr")) {
    const chart = lineChart(
      "tfr",
      afterOf("tfr"),
      `Total fertility rate, ${facts.name}`,
      "Births per woman",
      facts.series.tfr,
      "tfr",
      "TFR",
      "children per woman",
      "World Bank WDI SP.DYN.TFRT.IN (period TFR). Pre-1960 may blend HFD / UN WPP / Gapminder.",
    );
    if (chart) out.push(chart);
  }

  if (want.has("groups") && facts.groupTfr) {
    const g = facts.groupTfr;
    const keys = g.groups.filter(
      (k) => k !== "Total" && g.points.some((p) => p.groups[k] != null),
    );
    if (keys.length) {
      const manyYears = g.points.length >= 4;
      out.push({
        id: "groups",
        after: afterOf("groups"),
        type: manyYears ? "line" : "bar",
        title: g.headline,
        subtitle: facts.name,
        xKey: manyYears ? "year" : "group",
        series: manyYears
          ? keys.map((k) => ({ key: k, label: k }))
          : [{ key: "tfr", label: "TFR" }],
        data: manyYears
          ? g.points.map((p) => {
              const row: Record<string, string | number> = {
                year: String(p.year),
              };
              for (const k of keys) {
                if (p.groups[k] != null) row[k] = p.groups[k];
              }
              return row;
            })
          : keys.map((k) => ({
              group: k,
              tfr: g.latest[k] ?? g.points[g.points.length - 1]?.groups[k] ?? 0,
            })),
        unit: "children per woman",
        note: g.source,
      });
    }
  }

  if (want.has("labor") && facts.labor) {
    const L = facts.labor;
    out.push({
      id: "labor",
      after: afterOf("labor"),
      type: "bar",
      title: `Working-age and retirees, ${facts.name}`,
      subtitle: "15–64 vs 65+, modeled from today’s pyramid",
      xKey: "label",
      series: [
        { key: "working", label: "Working age (15–64)" },
        { key: "retirees", label: "Age 65+" },
      ],
      data: [
        {
          label: String(L.now.year),
          working: Math.round(L.now.working),
          retirees: Math.round(L.now.old),
        },
        {
          label: String(L.at2040.year),
          working: Math.round(L.at2040.working),
          retirees: Math.round(L.at2040.old),
        },
        {
          label: `${L.at2060.year}`,
          working: Math.round(L.at2060.working),
          retirees: Math.round(L.at2060.old),
        },
        {
          label: `${L.at2060Replacement.year} @2.1`,
          working: Math.round(L.at2060Replacement.working),
          retirees: Math.round(L.at2060Replacement.old),
        },
      ],
      unit: "people",
      note: L.note,
    });
  }

  if (want.has("population")) {
    const chart = lineChart(
      "population",
      afterOf("population"),
      `Population, ${facts.name}`,
      "Residents",
      facts.series.population,
      "pop",
      "Population",
      "people",
      "World Bank population estimates.",
    );
    if (chart) out.push(chart);
  }

  if (want.has("migration")) {
    const chart = lineChart(
      "migration",
      afterOf("migration"),
      `Net migration, ${facts.name}`,
      "Immigrants minus emigrants",
      facts.series.migration,
      "net",
      "Net migration",
      "people",
      "World Bank net migration.",
    );
    if (chart) out.push(chart);
  }

  if (want.has("dependency")) {
    const chart = lineChart(
      "dependency",
      afterOf("dependency"),
      `Age-dependency ratio, ${facts.name}`,
      "Dependents per working-age person",
      facts.series.dependency,
      "dep",
      "Dependency ratio",
      "%",
      "World Bank age-dependency ratio.",
    );
    if (chart) out.push(chart);
  }

  const rank = new Map(chartIds.map((id, i) => [id, i]));
  out.sort((a, b) => (rank.get((a.id as BriefingChartId) ?? "tfr") ?? 99) - (rank.get((b.id as BriefingChartId) ?? "tfr") ?? 99));
  return out;
}
