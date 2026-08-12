import "server-only";
import { fetchCountryTrade, oecIdForIso3 } from "@/lib/oec-fetch";

export type { CountryTrade, TradeFlow, TradeProduct } from "@/lib/oec-types";
export { oecIdForIso3 };

/** Server-side fetch (adds optional API token from env). */
export async function getCountryTrade(
  iso3: string,
  flow: "export" | "import",
  limit = 45,
) {
  return fetchCountryTrade(iso3, flow, limit, process.env.OEC_API_TOKEN);
}

export async function getCountryTradePair(iso3: string) {
  const token = process.env.OEC_API_TOKEN;
  const [exports, imports] = await Promise.all([
    fetchCountryTrade(iso3, "export", 45, token),
    fetchCountryTrade(iso3, "import", 45, token),
  ]);
  return { exports, imports };
}
