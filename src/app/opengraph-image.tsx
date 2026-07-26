import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1120 0%, #1e3a8a 100%)",
          padding: 80,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.8, marginBottom: 16 }}>
          UN · World Bank · OECD data
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
          birthrate.io
        </div>
        <div style={{ fontSize: 40, marginTop: 16, opacity: 0.9 }}>
          The world&apos;s demographic data platform
        </div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.7 }}>
          Fertility · Population · Migration · GDP · Projections
        </div>
      </div>
    ),
    { ...size },
  );
}
