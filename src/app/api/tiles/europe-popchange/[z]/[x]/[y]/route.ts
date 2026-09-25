import { readFileSync } from "fs";
import path from "path";
import { PMTiles } from "pmtiles";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ z: string; x: string; y: string }> };

let archive: PMTiles | null = null;

function getArchive(): PMTiles {
  if (archive) return archive;
  const filePath = path.join(
    process.cwd(),
    "public/tiles/europe-popchange.pmtiles",
  );
  const buf = readFileSync(filePath);
  const source = {
    getKey: () => filePath,
    getBytes: async (offset: number, length: number) => ({
      data: buf.buffer.slice(
        buf.byteOffset + offset,
        buf.byteOffset + offset + length,
      ),
    }),
  };
  archive = new PMTiles(
    source as ConstructorParameters<typeof PMTiles>[0],
  );
  return archive;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { z, x, y } = await params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(String(y).replace(/\.mvt$/i, ""));
  if (![zi, xi, yi].every(Number.isFinite)) {
    return new NextResponse("Bad tile coords", { status: 400 });
  }

  try {
    const tile = await getArchive().getZxy(zi, xi, yi);
    if (!tile) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(Buffer.from(tile.data), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.mapbox-vector-tile",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("[europe-popchange-tiles]", err);
    return new NextResponse("Tile error", { status: 500 });
  }
}
