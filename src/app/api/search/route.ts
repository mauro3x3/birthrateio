import { NextResponse } from "next/server";
import { search } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim())
    return NextResponse.json({ countries: [], cities: [], regions: [] });
  try {
    const results = await search(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ countries: [], cities: [], regions: [] });
  }
}
