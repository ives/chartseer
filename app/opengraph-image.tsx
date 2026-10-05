import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The link-preview card for LinkedIn, Slack and the rest (D-065). Colours are
// the light theme's, from globals.css; the fonts are static OFL files, as
// ImageResponse can't read next/font's.
export const alt = "Chartseer: describe a chart in plain English, get a chart";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#171717";
const MUTED = "#6b6a65";
const ACCENT = "#2e5a47";
const GRID = "#ecebe6";
const SERIES = ["#2a78d6", "#eb6834", "#22a775"];

// Stacked bars, bottom segment first: a small, made-up rising chart.
const BARS = [
  [70, 40, 20],
  [95, 50, 30],
  [120, 60, 35],
  [150, 75, 45],
  [190, 90, 55],
];

export default async function OpengraphImage() {
  const [fraunces, geist] = await Promise.all([
    readFile(join(process.cwd(), "assets/og-fonts/fraunces-semibold.ttf")),
    readFile(join(process.cwd(), "assets/og-fonts/geist-regular.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: "0 80px", background: "#ffffff" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-end", fontFamily: "Fraunces", fontSize: 104, color: INK, letterSpacing: -2 }}>
            Chartseer
            <div style={{ width: 30, height: 30, marginLeft: 6, marginBottom: 22, borderRadius: 3, background: ACCENT }} />
          </div>
          <div style={{ display: "flex", fontFamily: "Geist", fontSize: 40, lineHeight: 1.3, color: INK }}>
            Describe a chart in plain English. Get a chart.
          </div>
          <div style={{ display: "flex", fontFamily: "Geist", fontSize: 26, color: MUTED }}>
            The AI writes a validated chart spec, never code.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 360, paddingBottom: 2, borderBottom: `2px solid ${GRID}` }}>
          {BARS.map((segments, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column-reverse", gap: 3, width: 46 }}>
              {segments.map((height, s) => (
                <div key={s} style={{ height, background: SERIES[s], borderRadius: s === segments.length - 1 ? "4px 4px 0 0" : 0 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "Geist", data: geist, weight: 400, style: "normal" },
      ],
    },
  );
}
