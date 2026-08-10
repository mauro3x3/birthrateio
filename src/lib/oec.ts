import "server-only";
import oecIds from "@/lib/data/oec-country-ids.json";
import type { CountryTrade, TradeFlow, TradeProduct } from "@/lib/oec-types";

export type { CountryTrade, TradeFlow, TradeProduct } from "@/lib/oec-types";

const BASE = "https://api-v2.oec.world/tesseract";
/** BACI HS 2022 revision — free historical/international trade cube. */
const CUBE = "trade_i_baci_a_22";

type OecRecord = {
  Year?: number;
  Section?: string;
  HS4?: string;
  "Trade Value"?: number;
};

export function oecIdForIso3(iso3: string): string | null {
  const id = (oecIds.byIso3 as Record<string, string>)[iso3.toUpperCase()];
  return id ?? null;
}

function buildUrl(oecId: string, flow: TradeFlow, limit: number): string {
  const role = flow === "export" ? "Exporter Country" : "Importer Country";
  const url = new URL(`${BASE}/data.jsonrecords`);
  url.searchParams.set("cube", CUBE);
  url.searchParams.set("drilldowns", `Section,HS4,${role},Year`);
  url.searchParams.set("measures", "Trade Value");
  url.searchParams.set("include", `${role}:${oecId}`);
  url.searchParams.set("time", "Year.latest");
  url.searchParams.set("sort", "Trade Value.desc");
  url.searchParams.set("limit", `${limit},0`);
  const token = process.env.OEC_API_TOKEN;
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

/** Latest product mix (HS4) for a country’s exports or imports via OEC/BACI. */
export async function getCountryTrade(
  iso3: string,
  flow: TradeFlow,
  limit = 45,
): Promise<CountryTrade | null> {
  const oecId = oecIdForIso3(iso3);
  if (!oecId) return null;

  try {
    const res = await fetch(buildUrl(oecId, flow, limit), {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: OecRecord[];
      annotations?: { source_name?: string; dataset_link?: string };
    };
    const rows = (json.data ?? [])
      .map((r) => ({
        name: (r.HS4 ?? "Unknown").trim(),
        section: (r.Section ?? "Other").trim(),
        value: Number(r["Trade Value"] ?? 0),
        year: Number(r.Year ?? 0),
      }))
      .filter((r) => r.value > 0 && r.name);
    if (rows.length === 0) return null;

    const year = rows[0].year;
    const total = rows.reduce((s, r) => s + r.value, 0);
    const products: TradeProduct[] = rows.map((r) => ({
      name: r.name,
      section: r.section,
      value: r.value,
      share: total > 0 ? (r.value / total) * 100 : 0,
    }));

    return {
      year,
      flow,
      total,
      products,
      oecId,
      source: json.annotations?.source_name
        ? `OEC / ${json.annotations.source_name}`
        : "OEC / BACI",
      sourceUrl:
        json.annotations?.dataset_link ??
        "https://oec.world/en/resources/api",
    };
  } catch {
    return null;
  }
}

export async function getCountryTradePair(iso3: string): Promise<{
  exports: CountryTrade | null;
  imports: CountryTrade | null;
}> {
  const [exports, imports] = await Promise.all([
    getCountryTrade(iso3, "export"),
    getCountryTrade(iso3, "import"),
  ]);
  return { exports, imports };
}
