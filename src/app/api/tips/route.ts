import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set([
  "tfr",
  "population",
  "migration",
  "city",
  "other",
]);

function clampStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function isPlausibleUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const message = clampStr(b.message, 4000);
  const category =
    typeof b.category === "string" ? b.category.trim().toLowerCase() : "";

  if (!message || message.length < 8) {
    return NextResponse.json(
      { error: "Please describe the release (at least a short sentence)." },
      { status: 400 },
    );
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: "Invalid category." },
      { status: 400 },
    );
  }

  const name = clampStr(b.name, 120);
  const email = clampStr(b.email, 200);
  const url = clampStr(b.url, 2000);
  const subject = clampStr(b.subject, 200);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Email looks invalid." },
      { status: 400 },
    );
  }
  if (url && !isPlausibleUrl(url)) {
    return NextResponse.json(
      { error: "URL must start with http:// or https://." },
      { status: 400 },
    );
  }

  try {
    const tip = await prisma.dataTip.create({
      data: {
        name,
        email,
        url,
        subject,
        category,
        message,
        status: "NEW",
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: tip.id });
  } catch (err) {
    console.error("[api/tips]", err);
    return NextResponse.json(
      { error: "Could not save tip. Database may need a schema update." },
      { status: 500 },
    );
  }
}
