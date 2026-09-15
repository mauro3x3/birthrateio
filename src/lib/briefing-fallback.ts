import { SLUG } from "@/lib/indicators";
import type { BriefingFacts } from "@/lib/briefing-facts";
import type { BriefingModuleId } from "@/lib/briefing-modules";
import { formatCompact, formatNumber } from "@/lib/utils";

function stat(
  row: { value: number; year: number } | null | undefined,
  digits: number,
  compact = false,
): string {
  if (!row) return "not on file";
  const n = compact ? formatCompact(row.value) : formatNumber(row.value, digits);
  return `${n} (${row.year})`;
}

function people(n: number) {
  return formatCompact(n);
}

function compiledPolitics(facts: BriefingFacts): string {
  if (facts.angle.politicsBody) return facts.angle.politicsBody;
  const tfr = facts.stats[SLUG.fertility];
  const neighbors = facts.neighbors
    .filter((n) => !n.isSubject)
    .slice(0, 5)
    .map((n) => `${n.name} ${formatNumber(n.tfr, 2)}`)
    .join("; ");
  const g = facts.groupTfr;
  const L = facts.labor;
  const groupBit = g
    ? ` Official group TFR (${g.source.split(";")[0]}, ${g.latestYear}): ${Object.entries(
        g.latest,
      )
        .filter(([k]) => k !== "Total")
        .map(([k, v]) => `${k} ${formatNumber(v, 2)}`)
        .join("; ")}. Use that table; do not invent a split that the office does not publish.`
    : ` ${facts.name} has no official religion, ancestry, or origin TFR pack on this site, so this memo will not invent one.`;
  const laborBit = L
    ? ` Modeled from today’s pyramid: about ${people(L.now.working)} working-age people per ${people(L.now.old)} aged 65+ now (${formatNumber(L.now.workersPerRetiree, 1)} per retiree); ${L.at2040.year} about ${people(L.at2040.working)} working-age and ${formatNumber(L.at2040.workersPerRetiree, 1)} per retiree if today’s TFR holds.`
    : "";
  const below =
    tfr && tfr.value < 2.1
      ? " That is below replacement (~2.1): each generation of mothers is smaller than the last unless migration fills the gap."
      : tfr
        ? " That is at or above replacement (~2.1)."
        : "";
  return `The national average is the start of the memo, not the end. ${facts.name} period TFR is ${tfr ? `${formatNumber(tfr.value, 2)} (${tfr.year})` : "not on file"}.${below} Relative cohort size already feeds school places, the tax base, and who shows up on the electoral roll twenty years from now — whether or not anyone planned it.

${neighbors ? `Neighbors on the same World Bank series: ${neighbors}. That is the comparison a minister can point at.` : "Peer TFR is thin on file; use the compare tool."}${groupBit}${laborBit}

Family policy, participation, retirement age, and working-age migration are the levers that change those bars. This site does not say which to pull.`;
}

function leversBody(facts: BriefingFacts): string {
  const israel =
    facts.iso3 === "ISR"
      ? `\n\nIsrael already has child allowances and daycare subsidies. They scale with family size, so they cost more where TFR is 6 than where it is 2. They are not why Israel is the OECD outlier — religiosity is. Changing Bituach Leumi rates has historically moved some higher-order births at the margin. It has not manufactured a national TFR of 2.8–2.9 among secular Jews.`
      : "";
  return `Five inputs change the taxpayer/retiree picture. This site does not say which to pull.

1. Births. Period TFR sets the size of cohorts not yet born. It barely changes the 2040 workforce; it does change 2055–2070.

2. Who works. Headcount 15–64 is not employment. Labour-force participation moves tax receipts without moving TFR.

3. How long people work. Retirement age and years in the labour force change workers-per-retiree even if the pyramid stays put.

4. Who arrives. Working-age net migration can substitute for missing births in the short run; migrants also age.

5. Family policy. Cash, tax breaks, housing loans, parental leave, and subsidized childcare change the price of an extra child. That is what people mean by pronatalism. Whether it raises completed family size, or only when births happen, is empirical.

The record. France has run family allowances, the quotient familial, and crèches for decades; the Nordics pair long paid leave with cheap childcare. OECD (Society at a Glance 2024): those systems spend about 3% of GDP or more on family benefits. France’s TFR was 1.79 in 2022 — above the OECD average of 1.5, still below replacement (~2.1), and falling since about 2015. By 2022/23 even many of the comprehensive systems had drifted toward that 1.5 average. Work-and-family policy can sit with a higher TFR than southern Europe. It has not put any of these countries back at replacement.

Hungary is the loudest recent experiment: housing subsidies, tax relief for mothers of several children, a large family budget. Conventional period TFR rose from about 1.23 around 2011 toward the mid-1.5s, near the OECD average. Tempo-adjusted measures (Sobotka / N-IUSSP) show much of that upswing was births being brought forward as postponement slowed — not a matching rise in how many children women will finish with. Hungary did not return to 2.1.

South Korea is the other pole. Seoul has spent heavily on cash, housing, and leave while TFR fell to 0.78 in 2022 and about 0.72 in 2023, the lowest in the OECD. Japan’s long menu of bonuses and childcare has left TFR near 1.2–1.3. Period bumps from one-off baby bonuses tend to fade — classic timing.

Demographers’ summary, not a slogan: packages that make it easier to combine work and children are associated with modestly higher TFR than cash-only, often on the order of 0.1–0.2 children, and more with timing than with completed family size. No high-income country has climbed back to replacement on policy alone in recent decades. OECD: work and family policies alone are not enough to explain the cross-national variation.${israel}

A staffer who wants a different 2060 working-age bar has to change births, participation, retirement, or migration — and should not assume a baby bonus will do the first of those at replacement scale. A staffer who wants a different 2040 bar is mostly looking at who works, how long, and who arrives.`;
}

export function compiledBriefing(opts: {
  facts: BriefingFacts;
  modules: BriefingModuleId[];
}): {
  title: string;
  dek: string;
  sections: { id: string; heading: string; body: string }[];
  sources: string[];
  links: { label: string; href: string }[];
  mode: "compiled";
} {
  const { facts, modules } = opts;
  const s = facts.stats;
  const g = facts.groupTfr;
  const L = facts.labor;
  const tfr = s[SLUG.fertility];

  const neighborLine = facts.neighbors
    .filter((n) => !n.isSubject)
    .slice(0, 5)
    .map((n) => `${n.name} ${formatNumber(n.tfr, 2)}`)
    .join("; ");

  const groupLine = g
    ? `${g.source.split(";")[0]} (${g.latestYear}): ${Object.entries(g.latest)
        .filter(([k]) => k !== "Total" && k !== "All women")
        .map(([k, v]) => `${k} ${formatNumber(v, 2)}`)
        .join("; ")}.`
    : `${facts.name} has no official religion, ancestry, or origin TFR pack on this site.`;

  const compositionLine = (() => {
    const c = facts.composition;
    if (c && c.points.length >= 2) {
      const first = c.points[0];
      const lastHist =
        c.points.filter(
          (p) => c.projectionFromYear == null || p.year < c.projectionFromYear,
        ).at(-1) ?? c.points.at(-1)!;
      const lastProj =
        c.projectionFromYear != null ? c.points[c.points.length - 1] : null;
      const fmtShare = (row: { year: number; groups: Record<string, number> }) =>
        c.groups
          .map((k) => `${k} ${formatNumber(row.groups[k] ?? 0, 1)}%`)
          .join("; ");
      let body = `${c.source} In ${first.year}: ${fmtShare(first)}. In ${lastHist.year}: ${fmtShare(lastHist)}.`;
      if (lastProj && lastProj.year !== lastHist.year) {
        body += ` Projection for ${lastProj.year}: ${fmtShare(lastProj)}.`;
      }
      const births = facts.birthsComposition;
      if (births && births.points.length >= 1) {
        const bLast = births.points[births.points.length - 1];
        body += ` Births lead the stock (${births.source}): in ${bLast.year}, ${births.groups
          .map((k) => `${k} ${formatNumber(bLast.groups[k] ?? 0, 1)}%`)
          .join("; ")}.`;
      }
      return body;
    }
    const r = facts.religion;
    if (r && r.points.length >= 1) {
      const snap = r.points[r.points.length - 1];
      return `${r.source} Religion share (${snap.year}): ${r.groups
        .map((k) => `${k} ${formatNumber(snap.groups[k] ?? 0, 1)}%`)
        .join("; ")}. Race/ethnicity time series is not curated for this country yet.`;
    }
    return null;
  })();

  const byId: Record<BriefingModuleId, { heading: string; body: string }> = {
    snapshot: {
      heading: "Why this number matters",
      body: `A total fertility rate is a snapshot: how many children a woman would have if today’s age-specific rates held for a lifetime. It is not a promise. It still decides, with deaths and migration, how many pupils, workers, and pensioners ${facts.name} will have — and who they will be.\n\n${facts.name} now: ${stat(s[SLUG.population], 0, true)} people, period TFR ${stat(tfr, 2)}, life expectancy ${stat(s[SLUG.lifeExpectancy], 1)}. ${tfr && tfr.value >= 2.1 ? "That is at or above replacement (~2.1)." : "That is below replacement (~2.1), so each generation of mothers is smaller than the last unless migration fills the gap."} ${facts.angle.headline}`,
    },
    neighbors: {
      heading: "Look next door",
      body: neighborLine
        ? `Same neighborhood, different arithmetic. Latest period TFR: ${facts.name} ${tfr ? formatNumber(tfr.value, 2) : "n/a"}; ${neighborLine}. A staffer next door, reading the same World Bank series, would see a different size of the next school cohort — and a different working-age and taxpaying cohort twenty years on. The chart is the point.`
        : `Peer TFR is not on file for this country. Use the compare tool.`,
    },
    trajectory: {
      heading: "How fertility got here",
      body: facts.series.tfr.length >= 2
        ? `Period TFR in the series on file moved from ${formatNumber(facts.series.tfr[0].value, 2)} in ${facts.series.tfr[0].year} to ${formatNumber(facts.series.tfr[facts.series.tfr.length - 1].value, 2)} in ${facts.series.tfr[facts.series.tfr.length - 1].year}. A one-year dip can be timing (people delaying births) rather than a permanently smaller family. ${facts.nowcast ? `BirthGauge compiled ${facts.nowcast.year} at ${formatNumber(facts.nowcast.tfr, 2)} — a nowcast, not a replacement for the national office.` : ""}`
        : `The national TFR series is thin. Use the country profile.`,
    },
    age: {
      heading: "Who is already born",
      body: L
        ? `People aged 15–64 in ${L.at2040.year} are almost all alive today. Births this year show up in the workforce around 2041–2045, not in next year’s budget. ${s[SLUG.popShare65plus] ? `Share aged 65+ is ${stat(s[SLUG.popShare65plus], 1)}.` : ""} ${facts.pyramid ? `The age pyramid (${facts.pyramid.year}) is the picture: a fat base means many future workers; a fat top means many retirees already on the ledger.` : "Play the pyramid on the country demography tab if you want the 2100 picture."}`
        : `Play the pyramid on the country demography tab. The 2040 workforce is mostly people already born.`,
    },
    groups: {
      heading: "Not one fertility rate",
      body: groupLine + (facts.iso3 === "ISR"
        ? " Jewish and Muslim period rates have converged since the 1960s, when Muslim TFR was above 9. The remaining gap that matters for coalition math is religiosity inside the Jewish population (Haredi vs other), which CBS does not put on this religion table — cite IDI for that split."
        : facts.iso3 === "USA"
          ? " These are NCHS rates by race and Hispanic origin of the mother — not ancestry, language, or religion."
          : facts.groupTfr?.headline.includes("DHS")
            ? " These are DHS education splits — a background table, not a religion or ancestry census. If a national office publishes a different split, prefer that."
            : " If a group is not on an official table, this memo will not invent it."),
    },
    composition: {
      heading: "Who the country is becoming",
      body:
        (compositionLine ??
          `${facts.name} has no curated race / ethnicity or religion composition series on this site yet. Use the country demography charts if available.`) +
        (facts.extras.compositionWhy
          ? `\n\n${facts.extras.compositionWhy}`
          : ""),
    },
    labor: {
      heading: "Taxpayers and retirees",
      body: L
        ? `Think of ages 15–64 as the pool that can work and pay tax, and 65+ as the pool drawing a pension. That is not the same as actual employment — participation can be lower, especially for some groups.\n\n${facts.name} ${L.now.year}: about ${people(L.now.working)} working-age and ${people(L.now.old)} aged 65+, or ${formatNumber(L.now.workersPerRetiree, 1)} working-age people per retiree.\n\nIf today’s period TFR (${formatNumber(L.tfr, 2)}), life expectancy, and recent net migration held: ${L.at2040.year} would have about ${people(L.at2040.working)} working-age and ${people(L.at2040.old)} aged 65+ (${formatNumber(L.at2040.workersPerRetiree, 1)} per retiree). That 2040 working-age bar barely moves if TFR falls, because those adults are already born.\n\nBy ${L.at2060.year} the TFR shows up. At today’s TFR, about ${people(L.at2060.working)} working-age; at replacement 2.1, about ${people(L.at2060Replacement.working)}. ${L.note}`
        : `A population pyramid is not on file, so a 2040 workforce count is not modeled here.`,
    },
    migration: {
      heading: "What migration does",
      body: (() => {
        const net = facts.series.migration.length
          ? `Latest net migration: ${stat(s[SLUG.netMigration], 0, true)}.`
          : `Net migration is thin on this profile.`;
        const stock =
          facts.migrantStock && facts.migrantStockShare
            ? ` Foreign-born stock about ${people(facts.migrantStock.value)} (${formatNumber(facts.migrantStockShare.value, 1)}% of residents) in ${facts.migrantStock.year}.`
            : "";
        const origins = facts.immigrationOrigins
          ? ` Top birth countries of the foreign-born (${facts.immigrationOrigins.latestYear}, UN DESA stock): ${facts.immigrationOrigins.rows
              .slice(0, 5)
              .map((r) => `${r.name} ${people(r.value)}`)
              .join("; ")}.`
          : "";
        const abroad = facts.emigrationDestinations
          ? ` People born in ${facts.name} living abroad (${facts.emigrationDestinations.latestYear}): ${facts.emigrationDestinations.rows
              .slice(0, 4)
              .map((r) => `${r.name} ${people(r.value)}`)
              .join("; ")}. That is stock abroad, not annual emigration.`
          : "";
        const fiscal = facts.extras.migrationFiscal
          ? `\n\n${facts.extras.migrationFiscal.note} (${facts.extras.migrationFiscal.source}).`
          : "";
        return `Net migration can hold headcount up while fertility is below replacement. It does not freeze the age structure unless inflows stay large and young, year after year. ${net}${stock}${origins}${abroad}${fiscal}`;
      })(),
    },
    economy: {
      heading: "The budget constraint",
      body: (() => {
        const health = s[SLUG.healthExpenditure]
          ? ` Current health expenditure is ${stat(s[SLUG.healthExpenditure], 1)} of GDP.`
          : "";
        const old = s[SLUG.popShare65plus]
          ? ` Share aged 65+ is ${stat(s[SLUG.popShare65plus], 1)}.`
          : "";
        const laborBit = L
          ? ` Modeled workers per retiree: ${formatNumber(L.now.workersPerRetiree, 1)} now, about ${formatNumber(L.at2040.workersPerRetiree, 1)} in ${L.at2040.year}.`
          : "";
        const base = `Pay-as-you-go pensions and tax-funded care are transfers from current workers to current retirees. When workers-per-retiree falls, contributions, taxes, or benefits have to move — or the retirement age does. GDP per capita is ${stat(s[SLUG.gdpPerCapita], 0)}.${health}${old}${laborBit}`;
        if (!facts.extras.budget) {
          return `${base} A full national budget breakdown (pensions as a share of outlays) is not curated for this country yet — use the health-spend and age-65+ charts as pressure gauges, not as a substitute for a finance ministry table.`;
        }
        const b = facts.extras.budget;
        return `${base}

United States federal budget (${b.yearLabel}, CBO): total outlays about $${b.totalOutlaysT} trillion (${b.outlaysPctGdp}% of GDP). Social Security benefits about $${b.socialSecurityT} trillion; Medicare about $${(b.medicareB / 1000).toFixed(2)} trillion. Together those two programs are already a large share of federal spending — and they scale with the number and longevity of retirees, not with last year’s births. ${b.source}`;
      })(),
    },
    politics: {
      heading: "Political arithmetic",
      body: compiledPolitics(facts),
    },
    levers: {
      heading: "What actually moves the numbers",
      body: leversBody(facts),
    },
    watch: {
      heading: "What to watch",
      body: `The next figure that would change this memo is a new national-office vital-statistics release, or a new group TFR or composition table from the same office. Sources: ${facts.angle.cite.join("; ")}.`,
    },
  };

  const sections = modules.map((id) => ({ id, ...byId[id] }));

  return {
    title: `${facts.name}: a demographic briefing`,
    dek: facts.angle.headline,
    sections,
    sources: [
      ...facts.angle.cite,
      "World Bank WDI (TFR, population, migration, age shares)",
      ...(L ? ["birthrate.io cohort-component model from the current age pyramid"] : []),
      ...(facts.composition ? [facts.composition.source] : []),
      ...(facts.birthsComposition ? [facts.birthsComposition.source] : []),
      ...(facts.religion ? [facts.religion.source] : []),
      ...(facts.extras.budget ? [facts.extras.budget.source] : []),
      ...(facts.extras.migrationFiscal
        ? [facts.extras.migrationFiscal.source]
        : []),
      ...(modules.includes("levers")
        ? [
            "OECD, Society at a Glance 2024 (fertility and family-policy spend)",
            "Sobotka / N-IUSSP, tempo-adjusted fertility and Hungarian family policy",
          ]
        : []),
    ],
    links: [
      { label: `${facts.name} profile`, href: `/country/${facts.slug}` },
      { label: "Why birthrates matter", href: "/why" },
      ...(facts.iso3 === "USA"
        ? [{ label: "US race & Hispanic origin map", href: "/demographics/us" }]
        : []),
      ...(facts.mapHref
        ? [{ label: `${facts.name} regional map`, href: facts.mapHref }]
        : []),
    ],
    mode: "compiled",
  };
}
