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
    data: points.map((p) => ({ year: p.year, [seriesKey]: p.value })),
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
      (k) =>
        k !== "Total" &&
        k !== "All women" &&
        g.points.some((p) => p.groups[k] != null),
    );
    if (keys.length) {
      const manyYears = g.points.length >= 4;
      const shortLabel = (k: string) => {
        if (k === "Hispanic (any race)") return "Hispanic";
        if (k === "Non-Hispanic White") return "White (NH)";
        if (k === "Non-Hispanic Black") return "Black (NH)";
        if (k === "Non-Hispanic Asian") return "Asian (NH)";
        if (k === "Non-Hispanic American Indian and Alaska Native")
          return "AIAN (NH)";
        if (k === "Non-Hispanic Native Hawaiian and Other Pacific Islander")
          return "NHPI (NH)";
        return k;
      };
      out.push({
        id: "groups",
        after: afterOf("groups"),
        type: manyYears ? "line" : "bar",
        title: g.headline,
        subtitle: facts.name,
        xKey: manyYears ? "year" : "group",
        layout: manyYears ? undefined : "horizontal",
        series: manyYears
          ? keys.map((k) => ({
              key: k,
              label: k,
              color: g.colors?.[k],
              dashed: g.dashed?.includes(k),
            }))
          : [{ key: "tfr", label: "TFR" }],
        data: manyYears
          ? g.points.map((p) => {
              const row: Record<string, string | number | null> = {
                year: p.year,
              };
              for (const k of keys) {
                row[k] = p.groups[k] ?? null;
              }
              return row;
            })
          : keys.map((k, i) => ({
              group: shortLabel(k),
              tfr: g.latest[k] ?? g.points[g.points.length - 1]?.groups[k] ?? 0,
              // color via Cell index in horizontal chart
              _i: i,
            })),
        unit: g.unit ?? "children per woman",
        note: g.source,
        decimals: g.decimals ?? 2,
        referenceY: 2.1,
        referenceLabel: "Replacement 2.1",
        defaultFromYear: manyYears ? g.defaultFrom : undefined,
      });
    }
  }

  const pushComposition = (
    id: "composition" | "birthsComposition",
    pack: NonNullable<BriefingFacts["composition"]>,
  ) => {
    out.push({
      id,
      after: afterOf(id),
      type: "stackedArea",
      title: pack.headline,
      subtitle: facts.name,
      xKey: "year",
      series: pack.groups.map((k) => ({ key: k, label: k })),
      data: pack.points.map((p) => {
        const row: Record<string, string | number | null> = { year: p.year };
        for (const k of pack.groups) {
          row[k] = p.groups[k] ?? 0;
        }
        return row;
      }),
      unit: pack.unit,
      note:
        pack.projectionFromYear != null
          ? `${pack.source} Years from ${pack.projectionFromYear} are Census Bureau projections.`
          : pack.source,
      decimals: 1,
    });
  };

  if (want.has("composition") && facts.composition) {
    pushComposition("composition", facts.composition);
  }
  if (want.has("birthsComposition") && facts.birthsComposition) {
    pushComposition("birthsComposition", facts.birthsComposition);
  }

  if (want.has("religion") && facts.religion) {
    const r = facts.religion;
    const snap = r.points[r.points.length - 1];
    out.push({
      id: "religion",
      after: afterOf("religion"),
      type: "bar",
      title: r.headline,
      subtitle: `${facts.name} · ${snap.year}`,
      xKey: "group",
      layout: "horizontal",
      series: [{ key: "share", label: "Share" }],
      data: r.groups.map((k) => ({
        group: k,
        share: snap.groups[k] ?? 0,
      })),
      unit: r.unit,
      note: r.source,
      decimals: 1,
    });
  }

  if (want.has("pyramid") && facts.pyramid) {
    out.push({
      id: "pyramid",
      after: afterOf("pyramid"),
      type: "bar",
      title: `Age pyramid, ${facts.name}`,
      subtitle: `${facts.pyramid.year} · male / female`,
      xKey: "ageGroup",
      series: [{ key: "male", label: "Male" }],
      data: [],
      unit: "people",
      note: "World Bank population by age and sex.",
    });
  }

  if (want.has("labor") && facts.labor) {
    const L = facts.labor;
    // Chart in millions — raw headcounts (~1e8) make Recharts clip-height NaN in short previews.
    const mil = (n: number) => Math.round(n / 1e5) / 10; // one decimal million
    out.push({
      id: "labor",
      after: afterOf("labor"),
      type: "bar",
      title: `Working-age and retirees, ${facts.name}`,
      subtitle: "15–64 vs 65+, modeled from today’s pyramid",
      xKey: "period",
      series: [
        { key: "working", label: "Working age (15–64)" },
        { key: "retirees", label: "Age 65+" },
      ],
      data: [
        {
          period: String(L.now.year),
          working: mil(L.now.working),
          retirees: mil(L.now.old),
        },
        {
          period: String(L.at2040.year),
          working: mil(L.at2040.working),
          retirees: mil(L.at2040.old),
        },
        {
          period: `${L.at2060.year}`,
          working: mil(L.at2060.working),
          retirees: mil(L.at2060.old),
        },
        {
          period: `${L.at2060Replacement.year} @2.1`,
          working: mil(L.at2060Replacement.working),
          retirees: mil(L.at2060Replacement.old),
        },
      ],
      unit: "millions of people",
      decimals: 1,
      note: L.note,
    });
  }

  if (want.has("migrationOrigins") && facts.immigrationOrigins) {
    const o = facts.immigrationOrigins;
    out.push({
      id: "migrationOrigins",
      after: afterOf("migrationOrigins"),
      type: "bar",
      title: `Foreign-born stock by origin, ${facts.name}`,
      subtitle: `${o.latestYear} · UN DESA migrant stock (not annual inflows)`,
      xKey: "name",
      layout: "horizontal",
      series: [{ key: "people", label: "People" }],
      data: o.rows.slice(0, 8).map((r) => ({
        name: r.name,
        people: Math.round(r.value),
      })),
      unit: "people",
      note: `UN DESA International Migrant Stock. Total in corridors on file: ${Math.round(o.total).toLocaleString("en-US")}.`,
      decimals: 0,
    });
  }

  if (want.has("migrationDestinations") && facts.emigrationDestinations) {
    const d = facts.emigrationDestinations;
    out.push({
      id: "migrationDestinations",
      after: afterOf("migrationDestinations"),
      type: "bar",
      title: `${facts.name}-born living abroad`,
      subtitle: `${d.latestYear} · UN DESA migrant stock by destination`,
      xKey: "name",
      layout: "horizontal",
      series: [{ key: "people", label: "People" }],
      data: d.rows.slice(0, 8).map((r) => ({
        name: r.name,
        people: Math.round(r.value),
      })),
      unit: "people",
      note: `UN DESA International Migrant Stock. People born in ${facts.name} residing elsewhere.`,
      decimals: 0,
    });
  }

  if (want.has("budget") && facts.extras.budget) {
    const b = facts.extras.budget;
    const other = Math.max(
      0,
      b.totalOutlaysT * 1000 - b.socialSecurityT * 1000 - b.medicareB,
    );
    out.push({
      id: "budget",
      after: afterOf("budget"),
      type: "bar",
      title: `Federal outlays, United States (${b.yearLabel})`,
      subtitle: `Total ${b.totalOutlaysT}T · ${b.outlaysPctGdp}% of GDP`,
      xKey: "item",
      layout: "horizontal",
      series: [{ key: "billions", label: "$ billions" }],
      data: [
        { item: "Social Security", billions: Math.round(b.socialSecurityT * 1000) },
        { item: "Medicare", billions: Math.round(b.medicareB) },
        { item: "All other outlays", billions: Math.round(other) },
      ],
      unit: "$ billions",
      note: b.source,
      decimals: 0,
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

  if (want.has("share65")) {
    const chart = lineChart(
      "share65",
      afterOf("share65"),
      `Share aged 65+, ${facts.name}`,
      "Old-age share of residents",
      facts.series.share65,
      "share65",
      "Age 65+",
      "%",
      "World Bank population ages 65 and above (% of total).",
    );
    if (chart) out.push(chart);
  }

  if (want.has("health")) {
    const chart = lineChart(
      "health",
      afterOf("health"),
      `Health expenditure, ${facts.name}`,
      "Current health expenditure",
      facts.series.health,
      "health",
      "Health spend",
      "% of GDP",
      "World Bank current health expenditure (% of GDP). Not a pension line item — a proxy for age-linked public cost pressure.",
    );
    if (chart) out.push(chart);
  }

  const rank = new Map(chartIds.map((id, i) => [id, i]));
  out.sort((a, b) => (rank.get((a.id as BriefingChartId) ?? "tfr") ?? 99) - (rank.get((b.id as BriefingChartId) ?? "tfr") ?? 99));
  return out;
}
