import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a2540",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{ width: 36, height: 22, background: "#c9a24d", borderRadius: 3 }}
          />
          <div
            style={{ width: 68, height: 22, background: "#c9a24d", borderRadius: 3 }}
          />
          <div
            style={{ width: 100, height: 22, background: "#c9a24d", borderRadius: 3 }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
