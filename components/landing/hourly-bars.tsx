import { journeysByHour } from "./illustration-data";

// The product shot's chart: grouped bars of bike journeys by hour, weekdays
// against weekends. A static drawing of the real counts, not the app's renderer.
const layouts = {
  wide: { width: 640, height: 272, left: 44, right: 632, top: 20, bottom: 244, ticks: [0, 500, 1000, 1500, 2000], hours: [0, 6, 12, 18, 23] },
  narrow: { width: 360, height: 240, left: 40, right: 354, top: 14, bottom: 214, ticks: [0, 1000, 2000], hours: [0, 3, 6, 9, 12, 15, 18, 21] },
};
const TOP_VALUE = 2000;

const r1 = (n: number) => Math.round(n * 10) / 10;

// One path per series rather than a rect per bar keeps the page's HTML small.
function barsPath(values: number[], x: (hour: number) => number, width: number, y: (value: number) => number, bottom: number) {
  return values.map((value, hour) => `M${r1(x(hour))} ${bottom}V${r1(y(value))}h${width}V${bottom}z`).join("");
}

export function HourlyBars({ layout, className }: { layout: keyof typeof layouts; className?: string }) {
  const { width, height, left, right, top, bottom, ticks, hours } = layouts[layout];
  const band = (right - left) / 24;
  const barWidth = r1(band * 0.36);
  const y = (value: number) => bottom - (value / TOP_VALUE) * (bottom - top);
  const series = [
    { values: journeysByHour.weekday, offset: band * 0.12, fill: "fill-[var(--chart-1)]" },
    { values: journeysByHour.weekend, offset: band * 0.54, fill: "fill-[var(--chart-2)]" },
  ];
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className={`block h-auto w-full fill-muted ${className ?? ""}`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={left}
            x2={right}
            y1={y(tick)}
            y2={y(tick)}
            className={tick === 0 ? "stroke-border" : "stroke-border-faint"}
          />
          <text x={left - 8} y={y(tick) + 4} textAnchor="end">
            {tick.toLocaleString("en-GB")}
          </text>
        </g>
      ))}
      {series.map(({ values, offset, fill }) => (
        <path key={fill} d={barsPath(values, (hour) => left + hour * band + offset, barWidth, y, bottom)} className={fill} />
      ))}
      {hours.map((hour) => (
        <text key={hour} x={r1(left + (hour + 0.5) * band)} y={bottom + 18} textAnchor="middle">
          {hour}
        </text>
      ))}
    </svg>
  );
}
