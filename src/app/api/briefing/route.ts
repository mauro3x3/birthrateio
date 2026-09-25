import { NextResponse } from "next/server";
import { briefingChartsFromFacts } from "@/lib/briefing-charts";
import { compiledBriefing } from "@/lib/briefing-fallback";
import {
  getBriefingFacts,
  isChartId,
  isModuleId,
  isPlaceAfter,
} from "@/lib/briefing-facts";
import type { BriefingChartId, BriefingModuleId, BriefingPlaceAfter } from "@/lib/briefing-modules";
import type { BriefingFacts } from "@/lib/briefing-facts";
import { SLUG } from "@/lib/indicators";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();
const editHits = new Map<string, number[]>();
const MAX_EDITS_PER_WINDOW = 24;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const prev = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (prev.length >= MAX_PER_WINDOW) {
    hits.set(ip, prev);
    return false;
  }
  prev.push(now);
  hits.set(ip, prev);
  return true;
}

function rateLimitEdits(ip: string): boolean {
  const now = Date.now();
  const prev = (editHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (prev.length >= MAX_EDITS_PER_WINDOW) {
    editHits.set(ip, prev);
    return false;
  }
  prev.push(now);
  editHits.set(ip, prev);
  return true;
}

function fmtStat(
  row: { value: number; year: number } | null | undefined,
  digits: number,
): string {
  if (!row) return "n/a";
  return `${formatNumber(row.value, digits)} (${row.year})`;
}

function buildPrompt(opts: {
  facts: BriefingFacts;
  modules: BriefingModuleId[];
}): string {
  const { facts, modules } = opts;
  const s = facts.stats;
  const g = facts.groupTfr;
  const L = facts.labor;
  const peers = facts.neighbors
    .map((n) => `${n.name} ${n.tfr.toFixed(2)} (${n.year})${n.isSubject ? " [this country]" : ""}`)
    .join("; ");
  return `You write a political briefing a minister can forward to a colleague who is new to demography. Short paragraphs. Explain why each number matters. Descriptive, sourced, no campaign advice.

COUNTRY: ${facts.name} (${facts.iso3})
SITE: birthrate.io — charts will sit next to the matching section.

LATEST FIGURES (cite these; do not round away from them):
- Population: ${fmtStat(s[SLUG.population], 0)}
- Period TFR (World Bank): ${fmtStat(s[SLUG.fertility], 2)}
- Life expectancy: ${fmtStat(s[SLUG.lifeExpectancy], 1)}
- GDP per capita: ${fmtStat(s[SLUG.gdpPerCapita], 0)}
- Population growth: ${fmtStat(s[SLUG.populationGrowth], 2)}
- Net migration: ${fmtStat(s[SLUG.netMigration], 0)}
${
  facts.nowcast
    ? `- BirthGauge compiled TFR ${facts.nowcast.year}: ${facts.nowcast.tfr} (${facts.nowcast.source})`
    : "- No BirthGauge nowcast on file."
}
${
  g
    ? `- Group TFR (${g.source}, ${g.latestYear}): ${Object.entries(g.latest)
        .filter(([k]) => k !== "Total" && k !== "All women")
        .map(([k, v]) => `${k} ${v}`)
        .join("; ")}`
    : "- No official group TFR pack on this site. Do not invent religion/ancestry TFR."
}
${
  facts.composition
    ? `- Population composition (${facts.composition.source}): ${facts.composition.points
        .map(
          (p) =>
            `${p.year}: ${facts.composition!.groups
              .map((k) => `${k} ${(p.groups[k] ?? 0).toFixed(1)}%`)
              .join(", ")}`,
        )
        .join(" | ")}${
        facts.composition.projectionFromYear
          ? ` (years from ${facts.composition.projectionFromYear} are projections)`
          : ""
      }`
    : "- No curated race/ethnicity population composition series on file."
}
${
  facts.birthsComposition
    ? `- Births composition (${facts.birthsComposition.source}): ${facts.birthsComposition.points
        .map(
          (p) =>
            `${p.year}: ${facts.birthsComposition!.groups
              .map((k) => `${k} ${(p.groups[k] ?? 0).toFixed(1)}%`)
              .join(", ")}`,
        )
        .join(" | ")}`
    : ""
}
${
  facts.religion
    ? `- Religion share (${facts.religion.source}): ${facts.religion.points
        .map(
          (p) =>
            `${p.year}: ${facts.religion!.groups
              .map((k) => `${k} ${(p.groups[k] ?? 0).toFixed(1)}%`)
              .join(", ")}`,
        )
        .join(" | ")}`
    : ""
}
${
  facts.migrantStock
    ? `- Foreign-born stock: ${Math.round(facts.migrantStock.value).toLocaleString("en-US")} (${facts.migrantStock.year})${
        facts.migrantStockShare
          ? ` · ${facts.migrantStockShare.value.toFixed(1)}% of residents`
          : ""
      }`
    : ""
}
${
  facts.immigrationOrigins
    ? `- Immigrant origins (UN DESA stock ${facts.immigrationOrigins.latestYear}): ${facts.immigrationOrigins.rows
        .slice(0, 6)
        .map((r) => `${r.name} ${Math.round(r.value).toLocaleString("en-US")}`)
        .join("; ")}`
    : ""
}
${
  facts.emigrationDestinations
    ? `- ${facts.name}-born living abroad (UN DESA stock ${facts.emigrationDestinations.latestYear}): ${facts.emigrationDestinations.rows
        .slice(0, 5)
        .map((r) => `${r.name} ${Math.round(r.value).toLocaleString("en-US")}`)
        .join("; ")}`
    : ""
}
${
  facts.extras.budget
    ? `- US federal budget ${facts.extras.budget.yearLabel} (CBO): total outlays $${facts.extras.budget.totalOutlaysT}T (${facts.extras.budget.outlaysPctGdp}% of GDP); Social Security $${facts.extras.budget.socialSecurityT}T; Medicare $${(facts.extras.budget.medicareB / 1000).toFixed(2)}T.`
    : ""
}
${
  facts.extras.migrationFiscal
    ? `- Migration fiscal note: ${facts.extras.migrationFiscal.note}`
    : ""
}
${
  facts.extras.compositionWhy
    ? `- Composition stakes (use in composition section): ${facts.extras.compositionWhy}`
    : ""
}
- Health expenditure % GDP: ${fmtStat(s[SLUG.healthExpenditure], 1)}
- Share aged 65+: ${fmtStat(s[SLUG.popShare65plus], 1)}
Neighbors TFR: ${peers || "none on file"}
${
  L
    ? `LABOR MODEL (say it is modeled from today's pyramid, not an official forecast):
- ${L.now.year}: working-age ${Math.round(L.now.working)}, 65+ ${Math.round(L.now.old)}, workers/retiree ${L.now.workersPerRetiree.toFixed(1)}
- ${L.at2040.year}: working-age ${Math.round(L.at2040.working)}, 65+ ${Math.round(L.at2040.old)}, workers/retiree ${L.at2040.workersPerRetiree.toFixed(1)}
- ${L.at2060.year} at TFR ${L.tfr.toFixed(2)}: working-age ${Math.round(L.at2060.working)}
- ${L.at2060Replacement.year} at TFR 2.1: working-age ${Math.round(L.at2060Replacement.working)}
- Point: 2040 workers are already born. TFR changes 2060.`
    : "- No pyramid on file; skip made-up 2040 workforce counts."
}

COUNTRY STAKES:
Headline: ${facts.angle.headline}
${facts.angle.stakes.map((x) => `- ${x}`).join("\n")}
${
  facts.angle.politicsBody
    ? `POLITICS DETAIL (use these figures in the politics section; do not invent others):\n${facts.angle.politicsBody}`
    : ""
}
Notes for the writer (do not paste these into the memo):
${facts.angle.notes.map((x) => `- ${x}`).join("\n")}
Cite: ${facts.angle.cite.join("; ")}

SECTIONS TO WRITE (only these ids, in this order): ${modules.join(", ")}
Ids mean:
- snapshot: 80–120 words. Why TFR matters in plain language, then where the country stands.
- neighbors: 60–100 words. Name the peers and why a politician should care that next door looks different.
- trajectory: fertility path; timing vs quantum.
- age: who is already born. 2040 vs 2060.
- groups: official splits only. For Israel, convergence of Jewish/Muslim TFR since 1960, then CBS religiosity (Haredi 6.8 in 2022–24 vs secular Jewish 1.9); IDI for employment/fiscal context. For the US, NCHS race and Hispanic-origin TFR only.
- composition: race/ethnicity or religion share of residents. Use POPULATION COMPOSITION / RELIGION figures. Label projections clearly. Explain why group age structure, geography, and relative growth matter for schools, local politics, and the future electorate — descriptive, not a campaign brief.
- labor: use LABOR MODEL numbers. Taxpayers vs retirees.
- migration: net flows plus foreign-born stock and top origins/destinations when present. Label UN DESA as stock. Include the migration fiscal note if provided.
- economy: the budget constraint. Cite curated budget figures when present; otherwise use health expenditure % GDP, share aged 65+, and workers-per-retiree. Do not invent pension-line items.
- politics: 150–250 words. Use latest TFR vs replacement, named neighbors, official group TFR if present, and the labor model. No invented religion/ancestry split. For Israel, 300–450 words using POLITICS DETAIL (Haredi employment, tax, schools, draft pool, Judea and Samaria TFR).
- levers: 280–400 words. Keep the four arithmetic inputs (births / who works / retirement age / working-age migration). Then a fifth: family policy. Use PRONATALISM FACTS below. Name countries, years, and TFR. Distinguish period TFR bumps (timing) from completed family size. Do not recommend a policy.
- watch: 3 short bullets.

PRONATALISM FACTS (levers section only; do not invent others):
- OECD Society at a Glance 2024: OECD-average TFR 1.5 in 2022; Israel highest at ~2.9; France 1.79; Korea 0.78 in 2022 and about 0.72 in 2023. Comprehensive systems (France, Hungary, Nordics) spend about 3% of GDP or more on family benefits. Even many of those had fallen toward the OECD average by 2022/23. Quote the OECD point: work and family policies alone are not enough to explain cross-national variation.
- France: decades of allowances, quotient familial, crèches. TFR above OECD average, still below replacement (~2.1), falling since about 2015.
- Hungary 2010s package (housing, tax relief for larger families): conventional TFR rose from ~1.23 around 2011 toward the mid-1.5s. Tempo-adjusted TFR (Sobotka / N-IUSSP) barely moved — much of the rise was postponed births being brought forward, not larger completed families. Did not return to 2.1.
- Korea: heavy cash/housing/leave spend; lowest OECD TFR. Japan: long bonuses and childcare, TFR still ~1.2–1.3.
- Typical estimated effect of work-family packages vs cash-only: modest, often 0.1–0.2 children, more timing than quantum. No high-income country has returned to replacement on policy alone in recent decades.
${
  facts.iso3 === "ISR"
    ? "- Israel: child allowances and daycare already exist and scale with family size. They are not why TFR is 2.8–2.9 — religiosity is. Allowance rate changes have moved some higher-order births at the margin."
    : ""
}

RULES:
- Plain prose. No markdown headings inside body. You may use short paragraphs.
- No asterisks. No invented citations.
- If a figure is not in LATEST FIGURES, LABOR MODEL, neighbors, COUNTRY STAKES, or PRONATALISM FACTS, omit it.
- Tone: a calm civil-service memo a new staffer can follow. The site takes no position on what policy should follow.

Respond with STRICT JSON:
{
  "title": "string",
  "dek": "one sentence",
  "sections": [{"id": "snapshot", "heading": "string", "body": "string"}],
  "sources": ["string"],
  "links": [{"label": "string", "href": "/..."}]
}`;
}

function buildRevisePrompt(opts: {
  facts: BriefingFacts;
  heading: string;
  body: string;
  instruction: string;
}): string {
  const { facts, heading, body, instruction } = opts;
  const s = facts.stats;
  const g = facts.groupTfr;
  const L = facts.labor;
  const peers = facts.neighbors
    .map((n) => `${n.name} ${n.tfr.toFixed(2)} (${n.year})${n.isSubject ? " [this country]" : ""}`)
    .join("; ");
  return `Revise one section of a demographic briefing for ${facts.name} (${facts.iso3}).

INSTRUCTION: ${instruction}

CURRENT HEADING: ${heading}
CURRENT BODY:
${body}

You may cite these figures only (do not invent others):
- Population: ${fmtStat(s[SLUG.population], 0)}
- Period TFR: ${fmtStat(s[SLUG.fertility], 2)}
- Life expectancy: ${fmtStat(s[SLUG.lifeExpectancy], 1)}
- GDP per capita: ${fmtStat(s[SLUG.gdpPerCapita], 0)}
- Net migration: ${fmtStat(s[SLUG.netMigration], 0)}
${g ? `- Group TFR (${g.source}, ${g.latestYear}): ${Object.entries(g.latest).filter(([k]) => k !== "Total" && k !== "All women").map(([k, v]) => `${k} ${v}`).join("; ")}` : "- No official group TFR."}
${
  facts.composition
    ? `- Population composition (${facts.composition.source}): latest historical ${(() => {
        const c = facts.composition!;
        const row =
          c.points.filter(
            (p) => c.projectionFromYear == null || p.year < c.projectionFromYear,
          ).at(-1) ?? c.points.at(-1);
        if (!row) return "n/a";
        return `${row.year}: ${c.groups.map((k) => `${k} ${(row.groups[k] ?? 0).toFixed(1)}%`).join("; ")}`;
      })()}`
    : ""
}
Neighbors: ${peers || "none"}
${
  L
    ? `Labor model (modeled, not official): ${L.now.year} working-age ${Math.round(L.now.working)}, 65+ ${Math.round(L.now.old)}, ${L.now.workersPerRetiree.toFixed(1)} per retiree; ${L.at2040.year} working-age ${Math.round(L.at2040.working)}, ${L.at2040.workersPerRetiree.toFixed(1)} per retiree.`
    : ""
}
${facts.angle.politicsBody ? `Israel politics detail if relevant:\n${facts.angle.politicsBody}` : ""}

RULES: Descriptive, no campaign advice. Plain prose, no markdown. Keep every number that is already in the body unless the instruction says to drop it. The site takes no policy position.

Respond with STRICT JSON: { "heading": "string", "body": "string" }`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  let body: {
    action?: string;
    slug?: string;
    modules?: string[];
    charts?: string[];
    placements?: Record<string, string>;
    heading?: string;
    body?: string;
    instruction?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing country." }, { status: 400 });
  }

  if (body.action === "revise") {
    if (!rateLimitEdits(ip)) {
      return NextResponse.json(
        { error: "Too many edits from this network. Try again in an hour." },
        { status: 429 },
      );
    }
    const heading = String(body.heading ?? "").slice(0, 160);
    const sectionBody = String(body.body ?? "").slice(0, 8000);
    const instruction = String(body.instruction ?? "").trim().slice(0, 400);
    if (!instruction) {
      return NextResponse.json({ error: "Say what to change." }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: "Add OpenAI credits to expand or rewrite with AI. You can still edit the text yourself." },
        { status: 503 },
      );
    }
    const facts = await getBriefingFacts(slug);
    if (!facts) {
      return NextResponse.json({ error: "Country not found." }, { status: 404 });
    }
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You revise one section of a birthrate.io briefing. Output JSON only.",
            },
            {
              role: "user",
              content: buildRevisePrompt({
                facts,
                heading,
                body: sectionBody,
                instruction,
              }),
            },
          ],
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        console.error("OpenAI briefing revise error", res.status, detail);
        return NextResponse.json(
          {
            error:
              res.status === 429
                ? "OpenAI returned no credits. Edit the text yourself, or add billing at platform.openai.com."
                : "Could not rewrite that section.",
          },
          { status: 503 },
        );
      }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { heading?: string; body?: string };
      if (typeof parsed.body !== "string" || parsed.body.trim().length === 0) {
        return NextResponse.json(
          { error: "The model returned an empty rewrite." },
          { status: 502 },
        );
      }
      return NextResponse.json({
        heading:
          typeof parsed.heading === "string" && parsed.heading.trim()
            ? parsed.heading.slice(0, 160)
            : heading,
        body: parsed.body.slice(0, 8000),
      });
    } catch (err) {
      console.error("briefing revise", err);
      return NextResponse.json(
        { error: "Could not rewrite that section." },
        { status: 502 },
      );
    }
  }

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many briefings from this network. Try again in an hour." },
      { status: 429 },
    );
  }

  const modules = (body.modules ?? []).filter(isModuleId);
  const charts = (body.charts ?? []).filter(isChartId);
  const placements: Partial<Record<BriefingChartId, BriefingPlaceAfter>> = {};
  for (const [k, v] of Object.entries(body.placements ?? {})) {
    if (isChartId(k) && typeof v === "string" && isPlaceAfter(v)) {
      placements[k] = v;
    }
  }
  if (modules.length === 0) {
    return NextResponse.json(
      { error: "Select at least one section." },
      { status: 400 },
    );
  }

  const facts = await getBriefingFacts(slug);
  if (!facts) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const chartSpecs = briefingChartsFromFacts(
    facts,
    charts.filter((id) => facts.charts.find((c) => c.id === id)?.available) as BriefingChartId[],
    placements,
  );

  const fallback = () => {
    const compiled = compiledBriefing({ facts, modules });
    return NextResponse.json({
      ...compiled,
      country: { name: facts.name, slug: facts.slug, iso3: facts.iso3 },
      generatedAt: new Date().toISOString(),
      charts: chartSpecs,
      callouts: facts.callouts,
    });
  };

  if (!apiKey) return fallback();

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a demographic briefing officer for birthrate.io. Output JSON only.",
          },
          { role: "user", content: buildPrompt({ facts, modules }) },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenAI briefing error", res.status, detail);
      return fallback();
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      title?: string;
      dek?: string;
      sections?: { id?: string; heading?: string; body?: string }[];
      sources?: string[];
      links?: { label?: string; href?: string }[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fallback();
    }

    const allowed = new Set(modules);
    const sections = (parsed.sections ?? [])
      .filter(
        (s) =>
          s &&
          typeof s.heading === "string" &&
          typeof s.body === "string" &&
          typeof s.id === "string" &&
          allowed.has(s.id as BriefingModuleId),
      )
      .map((s) => ({
        id: s.id as string,
        heading: String(s.heading).slice(0, 120),
        body: String(s.body).slice(0, 4000),
      }));

    if (sections.length === 0) return fallback();

    const links = (parsed.links ?? [])
      .filter(
        (l) =>
          l &&
          typeof l.label === "string" &&
          typeof l.href === "string" &&
          l.href.startsWith("/"),
      )
      .slice(0, 5)
      .map((l) => ({ label: String(l.label).slice(0, 80), href: l.href as string }));

    return NextResponse.json({
      title:
        typeof parsed.title === "string"
          ? parsed.title.slice(0, 160)
          : `Demographic briefing: ${facts.name}`,
      dek:
        typeof parsed.dek === "string"
          ? parsed.dek.slice(0, 280)
          : facts.angle.headline,
      country: { name: facts.name, slug: facts.slug, iso3: facts.iso3 },
      generatedAt: new Date().toISOString(),
      mode: "ai",
      sections,
      charts: chartSpecs,
      callouts: facts.callouts,
      sources: [
        ...new Set([
          ...(Array.isArray(parsed.sources)
            ? parsed.sources.filter((x) => typeof x === "string").slice(0, 8)
            : []),
          ...facts.angle.cite,
        ]),
      ].slice(0, 10),
      links:
        links.length > 0
          ? links
          : [
              { label: `${facts.name} profile`, href: `/country/${facts.slug}` },
              { label: "Why birthrates matter", href: "/why" },
            ],
    });
  } catch (err) {
    console.error("briefing", err);
    return fallback();
  }
}
