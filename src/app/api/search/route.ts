import { NextResponse } from "next/server";
import { search } from "@/lib/queries";
import { suggestSearch } from "@/lib/search-insights";

export const dynamic = "force-dynamic";

const EMPTY = {
  countries: [],
  cities: [],
  regions: [],
  topics: [],
  insights: [],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json(EMPTY);
  try {
    const results = await search(q);
    return NextResponse.json(results);
  } catch {
    const suggested = suggestSearch(q);
    return NextResponse.json({
      ...EMPTY,
      topics: suggested.topics,
      insights: suggested.insights,
    });
  }
}
