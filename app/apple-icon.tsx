import { ImageResponse } from "next/og";

// The home-screen icon: icon.svg's three bars, drawn at 180px. iOS rounds
// the corners itself, so the square is filled edge to edge.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BARS = [45, 73, 101];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 13,
          paddingBottom: 39,
          background: "#2e5a47",
        }}
      >
        {BARS.map((height) => (
          <div key={height} style={{ width: 25, height, borderRadius: 6, background: "#ffffff" }} />
        ))}
      </div>
    ),
    size,
  );
}
