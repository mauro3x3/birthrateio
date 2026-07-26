import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runIngestion } from "@/lib/sources/run-ingestion";

// A full ingestion is long-running; on Vercel this needs a Pro plan and an
// extended duration. For free-tier deploys, prefer running `npm run ingest`
// from a GitHub Action or local machine (see README).
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await runIngestion(prisma, { source: "worldbank" });
    // Refresh cached aggregates so the site shows fresh data immediately.
    for (const tag of ["countries", "indicators", "releases"]) {
      revalidateTag(tag);
    }
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
