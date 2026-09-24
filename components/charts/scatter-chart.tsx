import type { ReactNode } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { ScatterData } from "@/lib/data/prepare";
import { type Axes, type Axis, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";

type ScatterChartProps = {
  spec: Extract<ChartSpec, { type: "scatter" }>;
  data: ScatterData;
  dataset: DatasetMeta;
  description: string;
  table: ReactNode;
};

const HEIGHT = 400;
const RADIUS = 4;

export function ScatterChart({ spec, data, dataset, description, table }: ScatterChartProps) {
  const points = data.groups.flatMap((g) => g.points);
  const xDomain = extent(points.map((p) => p.x), spec.x.scale);
  const yDomain = extent(points.map((p) => p.y), spec.y.scale);

  const axes = (inner: Inner): Axes => ({
    x: axis(spec.x.scale, xDomain, [0, inner.width], data.x.label),
    y: axis(spec.y.scale, yDomain, [inner.height, 0], data.y.label),
  });

  return (
    <ChartFrame
      title={spec.title}
      subtitle={spec.subtitle}
      legend={{
        title: data.groupLabel,
        items: data.groups.map((g, i) => ({ label: g.label, color: seriesColor(i) })),
      }}
      dataset={dataset}
      description={description}
      table={table}
      height={HEIGHT}
      axes={axes}
    >
      {({ x, y }) => {
        if ((x.kind !== "linear" && x.kind !== "log") || (y.kind !== "linear" && y.kind !== "log")) return null;
        return data.groups.map((g, i) => (
          // fill-opacity applies to each circle, so overlapping points build up density;
          // opacity on the group would flatten them into one layer.
          <g key={String(g.key)} style={{ fill: seriesColor(i), fillOpacity: "var(--chart-point-opacity)" }}>
            {g.points.map((p, j) => (
              <circle key={j} cx={x.scale(p.x)} cy={y.scale(p.y)} r={RADIUS} />
            ))}
          </g>
        ));
      }}
    </ChartFrame>
  );
}

// Scatter axes span their points rather than starting at zero: the zero
// baseline is for measures (D-022), and a longitude axis from 0 would be
// meaningless (D-028). Validation guarantees a log axis's values are above zero.
function axis(scale: "linear" | "log" | undefined, domain: [number, number], range: [number, number], label: string): Axis {
  if (scale === "log") {
    return { kind: "log", scale: scaleLog().domain(domain).range(range).nice(), label, grid: true };
  }
  return { kind: "linear", scale: scaleLinear().domain(domain).range(range).nice(), label, grid: true };
}

// The smallest and largest values. With no spread, a unit (or on a log
// axis, a decade) either side, so the scale never collapses.
function extent(values: number[], scale: "linear" | "log" | undefined): [number, number] {
  const log = scale === "log";
  if (values.length === 0) return log ? [1, 10] : [0, 1];
  let [lo, hi] = [Infinity, -Infinity];
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo !== hi) return [lo, hi];
  return log ? [lo / 10, hi * 10] : [lo - 1, hi + 1];
}
