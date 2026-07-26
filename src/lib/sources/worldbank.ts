// World Bank Open Data API adapter.
// Docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
// No API key required. We page through results and normalise to our schema.

const BASE = "https://api.worldbank.org/v2";

export interface WBCountry {
  id: string; // iso3
  iso2Code: string;
  name: string;
  capitalCity: string;
  longitude: string;
  latitude: string;
  region: { id: string; iso2code: string; value: string };
  incomeLevel: { id: string; value: string };
}

export interface WBValue {
  iso3: string;
  year: number;
  value: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Transient statuses the World Bank API occasionally returns under load.
const RETRYABLE = new Set([400, 429, 500, 502, 503, 504]);

async function wbFetch<T>(url: string, attempt = 0): Promise<T> {
  try {
    // Node's fetch has NO default timeout — without this a throttled World Bank
    // connection can hang forever. Abort after 25s and let the retry kick in.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": "birthrate.io ingestion" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      if (RETRYABLE.has(res.status) && attempt < 5) {
        await sleep(1500 * (attempt + 1));
        return wbFetch<T>(url, attempt + 1);
      }
      throw new Error(`World Bank API ${res.status} for ${url}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    // Network hiccups / resets — retry with backoff.
    if (attempt < 5) {
      await sleep(1500 * (attempt + 1));
      return wbFetch<T>(url, attempt + 1);
    }
    throw err;
  }
}

/** Fetch all sovereign countries (excludes aggregates where region.id === 'NA'). */
export async function fetchCountries(): Promise<WBCountry[]> {
  const json = await wbFetch<[unknown, WBCountry[]]>(
    `${BASE}/country?format=json&per_page=400`,
  );
  return json[1] ?? [];
}

/** Fetch a full indicator time series for all countries. */
export async function fetchIndicator(
  code: string,
  startYear = 1960,
  endYear = new Date().getFullYear(),
): Promise<WBValue[]> {
  const out: WBValue[] = [];
  let page = 1;
  let pages = 1;
  do {
    // per_page kept moderate to avoid occasional 400s on very large pages.
    const url = `${BASE}/country/all/indicator/${code}?format=json&per_page=5000&date=${startYear}:${endYear}&page=${page}`;
    const json = await wbFetch<
      [
        { pages: number },
        Array<{
          countryiso3code: string;
          date: string;
          value: number | null;
        }> | null,
      ]
    >(url);
    pages = json[0]?.pages ?? 1;
    const rows = json[1] ?? [];
    for (const r of rows) {
      if (r.value === null || !r.countryiso3code) continue;
      const year = Number(r.date);
      if (!Number.isFinite(year)) continue;
      out.push({ iso3: r.countryiso3code, year, value: r.value });
    }
    page++;
  } while (page <= pages);
  return out;
}

// Map World Bank region codes to readable continents.
export const WB_REGION_TO_CONTINENT: Record<string, string> = {
  EAS: "Asia",
  ECS: "Europe",
  LCN: "Americas",
  MEA: "Middle East & North Africa",
  NAC: "Americas",
  SAS: "Asia",
  SSF: "Africa",
};
