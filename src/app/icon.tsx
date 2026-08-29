import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a2540",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
          }}
        >
          <div style={{ width: 6, height: 4, background: "#c9a24d", borderRadius: 1 }} />
          <div style={{ width: 12, height: 4, background: "#c9a24d", borderRadius: 1 }} />
          <div style={{ width: 18, height: 4, background: "#c9a24d", borderRadius: 1 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
