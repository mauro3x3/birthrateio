import { NextResponse } from "next/server";
import { getAllCountries } from "@/lib/queries";
import { INDICATORS } from "@/lib/indicators";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SITE_MAP = `
- / : Homepage dashboard (latest fertility/population highlights, global maps, rankings)
- /topics : Subject catalogue (People, Society, Economy, Tools) — DST-style topic hub
- /fertility : Fertility explorer (global map, rankings, movers, TFR by ancestry/origin where NSOs publish it — Denmark FERT1, Norway 12482)
- /population : Population explorer (rankings, projections, growth calculator)
- /migration : Migration explorer (net migration & foreign-born maps, rankings)
- /mortality : Mortality explorer — life expectancy, historic death rates (HMD), under-five mortality as far back as sources allow
- /crime : Crime by ancestry/origin — charts where NSOs publish data, plus an availability registry for countries that don't
- /states : States & provinces explorer (US, Germany, India, China, Russia, …)
- /maps and /maps/<iso3> : Census-style regional choropleths (TFR, population, population change) for India, Russia, China, USA and ~25 other countries. Iran is listed but has no redistributable provincial table yet.
- /demographics : US demographics map — race & Hispanic origin by state (ACS)
- /demographics/uk : England & Wales Census 2021 ethnic group by LAD/MSOA
- /demographics/denmark : Denmark ancestry (Danish origin / immigrant / descendant) by kommune
- /demographics/germany : Germany Census 2021 country of birth by Kreis
- /demographics/spain : Spain Census 2021 country of birth by province
- /demographics/russia : Russia 2021 census ethnic group by federal subject (Rosstat VPN-2020)
- /demographics/<country> : Same census-map explorer for other European countries (France, Italy, Netherlands, …)
- /state/<slug> : Subnational profile — population & fertility for a state/province/Land
- /gdp : GDP explorer (rankings, GDP per capita, growth)
- /cities : Cities database
- /compare?countries=slug1,slug2,slug3 : Overlay multiple countries on any indicator. Optional from=&to= years zoom the chart (e.g. from=2000&to=2022).
- /simulator : Build custom population projections from assumptions (TFR, life expectancy, migration), animate the age pyramid over time, export video/GIF, and project GDP per capita & total GDP. It accepts URL params to pre-fill a scenario: country=<slug>, tfr=<0.5–8>, life=<40–95 life expectancy>, migration=<net migrants per 5-yr step>, years=<20–150 horizon>, gdp=<starting GDP per capita US$>, growth=<-2–10 % annual real growth>, pop=<custom starting population, omit country to use it>. Example: /simulator?country=italy&tfr=1.2&years=80
- /clock : Live fertility / world population clock (illustrative extrapolation from annual rates)
- /calendar : Upcoming demographic data releases (TFR/fertility highlighted)
- /contribute : Tip form to report newly released official demographic data
- /country/<slug> : Full country profile — population, fertility, births vs deaths, historic mortality (life expectancy / HMD death rates / child mortality), GDP, exports & imports (OEC/BACI treemap), migration, foreign-born/diaspora, unemployment native vs foreign-born, crime-by-ancestry where published (or an explicit note when not), population pyramid, modeled ethnicity pyramid, ethnic & religious composition over time, births by ethnicity, abortion/homicide/divorce/home-ownership and more
`.trim();

function buildSystemPrompt(countryList: string): string {
  const indicatorList = INDICATORS.map(
    (i) => `${i.shortName} (${i.unit})`,
  ).join(", ");
  return `You are "Cohort", the AI guide for birthrate.io — a demographic data platform. Users want SHAREABLE VISUALS (charts they can post on social media), not essays.

For every question, your PRIMARY output is a CHART that visualizes the answer. Build the chart data from your demographic knowledge — real historical figures where you know them, reasonable projections/estimates otherwise. Always set "note" to cite the basis (e.g. "UN World Population Prospects" or "AI estimate — illustrative").

Rules for the response:
1) "caption": ONE short plain-text sentence (max ~25 words). NO markdown, NO asterisks, NO tags, NO links inside it.
2) "chart": the visual. Pick the best type:
   - "bar" / "stackedBar": categories (e.g. countries, ethnic groups in one year)
   - "line": trends over time, comparing a few entities
   - "area" / "stackedArea": one entity's total/composition over time
   - "pie": a single year's share breakdown (composition)
   Keep it readable: <= 12 x-axis points and <= 6 series. Round numbers sensibly.
3) "links": 1–3 deep links into the site (see LINK RULES). Optional but encouraged.

If the question is truly non-visual (e.g. "how do I download a CSV?"), set chart to null and just give a helpful caption + links.

SITE MAP:
${SITE_MAP}

INDICATORS available per country: ${indicatorList}.

LINK RULES (href MUST be a relative path starting with "/", never a full URL):
- Country profile: /country/<slug>. Use the exact slug from the COUNTRY LIST when present; otherwise lowercase the name and replace spaces with hyphens.
- Compare countries: /compare?countries=slug1,slug2 (2–5 slugs).
- Pre-fill the simulator for scenarios: /simulator?country=italy&tfr=1.2&years=80 (params above).
- Explorers: /topics /fertility /population /migration /mortality /crime /demographics /gdp /states /maps /cities /calendar /clock /contribute.

Respond with STRICT JSON only (no code fences), matching this shape:
{
  "caption": "string",
  "chart": null | {
    "type": "bar|stackedBar|line|area|stackedArea|pie",
    "title": "string",
    "subtitle": "string",
    "xKey": "string (the field name used for the x-axis / category, e.g. \\"year\\" or \\"group\\")",
    "series": [{"key": "string (field name in data)", "label": "string"}],
    "data": [{"<xKey>": "value", "<series.key>": number, ...}],
    "unit": "string (optional, e.g. \\"%\\" or \\"millions\\")",
    "note": "string (source or estimate caveat)"
  },
  "links": [{"label": "string", "href": "/..."}]
}

EXAMPLE (question: "What will world demographics look like racially in 2100?"):
{"caption":"By 2100 Africa is projected to hold ~38% of humanity, reshaping the global ethnic mix.","chart":{"type":"stackedArea","title":"Share of world population by region","subtitle":"2020 vs 2100 (UN medium projection)","xKey":"year","series":[{"key":"africa","label":"Africa"},{"key":"asia","label":"Asia"},{"key":"europe","label":"Europe"},{"key":"americas","label":"Americas"}],"data":[{"year":"2020","africa":17,"asia":59,"europe":10,"americas":13},{"year":"2060","africa":28,"asia":52,"europe":7,"americas":12},{"year":"2100","africa":38,"asia":45,"europe":6,"americas":10}],"unit":"%","note":"UN World Population Prospects 2024 (medium variant)"},"links":[{"label":"Population explorer","href":"/population"}]}

COUNTRY LIST (name => slug):
${countryList}`;
}

const CHART_TYPES = [
  "bar",
  "stackedBar",
  "line",
  "area",
  "stackedArea",
  "pie",
];

// Defensive validation — the chart is rendered client-side, so make sure the
// shape is sane before trusting it.
function validateChart(c: unknown) {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  if (!CHART_TYPES.includes(String(o.type))) return null;
  if (typeof o.xKey !== "string") return null;
  if (!Array.isArray(o.series) || o.series.length === 0) return null;
  if (!Array.isArray(o.data) || o.data.length === 0) return null;

  const series = o.series
    .filter(
      (s): s is { key: string; label: string } =>
        !!s &&
        typeof (s as { key?: unknown }).key === "string" &&
        typeof (s as { label?: unknown }).label === "string",
    )
    .slice(0, 6);
  if (series.length === 0) return null;

  const data = (o.data as Record<string, unknown>[])
    .slice(0, 16)
    .map((row) => {
      const out: Record<string, number | string> = {};
      out[o.xKey as string] = String(row[o.xKey as string] ?? "");
      for (const s of series) {
        const v = row[s.key];
        out[s.key] = typeof v === "number" ? v : Number(v) || 0;
      }
      return out;
    });

  return {
    type: o.type,
    title: typeof o.title === "string" ? o.title : "Chart",
    subtitle: typeof o.subtitle === "string" ? o.subtitle : undefined,
    xKey: o.xKey,
    series,
    data,
    unit: typeof o.unit === "string" ? o.unit : undefined,
    note: typeof o.note === "string" ? o.note : undefined,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The assistant is not configured (missing OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = (body.messages ?? []).slice(-10);
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  // Compact country name=>slug list for accurate links.
  let countryList = "";
  try {
    const countries = await getAllCountries();
    countryList = countries
      .map((c) => `${c.name}=${c.slug}`)
      .join("\n");
  } catch {
    countryList = "(country list unavailable)";
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
          { role: "system", content: buildSystemPrompt(countryList) },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenAI error", res.status, detail);
      return NextResponse.json(
        { error: "The assistant is unavailable right now. Please try again." },
        { status: 502 },
      );
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      caption?: string;
      answer?: string;
      chart?: unknown;
      links?: { label: string; href: string }[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { caption: raw, links: [] };
    }

    // Keep only safe internal links (relative paths only).
    const links = (parsed.links ?? [])
      .filter((l) => l && typeof l.href === "string" && l.href.startsWith("/"))
      .slice(0, 5);

    return NextResponse.json({
      caption: parsed.caption ?? parsed.answer ?? "Here's what I found.",
      chart: validateChart(parsed.chart),
      links,
    });
  } catch (err) {
    console.error("Assistant request failed", err);
    return NextResponse.json(
      { error: "The assistant failed to respond. Please try again." },
      { status: 500 },
    );
  }
}
