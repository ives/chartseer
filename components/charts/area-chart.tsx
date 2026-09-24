import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { area, stack } from "d3-shape";
import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { CartesianData } from "@/lib/data/prepare";
import { AnnotationLayer } from "./annotation-layer";
import { type Point, edgePaths, locate, seriesPoints, xAxis } from "./cartesian";
import { type Axes, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";
import { partialNote } from "./partial-note";
import { valueDomain } from "./value-domain";

type AreaChartProps = {
  spec: Extract<ChartSpec, { type: "area" }>;
  data: CartesianData;
  dataset: DatasetMeta;
  description: string;
  table: ReactNode;
};

// One layer of the chart: its bottom and top edge at each x value, in data units.
type Layer = { lower: (number | null)[]; upper: (number | null)[] };
type FillPoint = Point & { lower: number };

const HEIGHT = 360;

export function AreaChart({ spec, data, dataset, description, table }: AreaChartProps) {
  const stacked = spec.stacked === true && data.series.length > 1;
  const layers = stacked ? stackLayers(data) : data.series.map((s) => ({ lower: s.values.map(() => 0), upper: s.values }));
  const domain = valueDomain(layers.flatMap((l) => [...l.lower, ...l.upper]));

  const axes = (inner: Inner): Axes => ({
    x: xAxis(data, inner.width),
    y: { kind: "linear", scale: scaleLinear().domain(domain).range([inner.height, 0]).nice(), label: data.y.label, grid: true },
  });

  return (
    <ChartFrame
      title={spec.title}
      subtitle={spec.subtitle}
      legend={{
        title: data.seriesLabel,
        items: data.series.map((s, i) => ({ label: s.label, color: seriesColor(i) })),
      }}
      dataset={dataset}
      // Stacked partial buckets are filled lighter, like bars; plain ones get a dashed edge, like lines.
      note={partialNote(data, stacked ? "Lighter" : "Dashed")}
      description={description}
      table={table}
      height={HEIGHT}
      axes={axes}
    >
      {({ x, y }, inner) => {
        const py = (value: number) => (y.kind === "linear" ? y.scale(value) : 0);
        const shapes = layers.map((layer) =>
          seriesPoints(data, layer.upper, x).map((p, j) => ({ ...p, lower: layer.lower[j] ?? 0 })),
        );
        const fill = (points: FillPoint[], defined: (p: FillPoint) => boolean) =>
          area<FillPoint>()
            .defined(defined)
            .x((p) => p.x)
            .y0((p) => py(p.lower))
            .y1((p) => py(p.y ?? 0))(points) ?? undefined;
        const present = (p: FillPoint) => p.y !== null;
        return (
          <>
            <AnnotationLayer
              annotations={data.annotations}
              locate={(a) => locate(x, a)}
              axis="x"
              inner={inner}
            />
            {shapes.map((points, i) => {
              const color = seriesColor(i);
              const key = String(data.series[i]?.key ?? i);
              if (stacked) {
                // Partial buckets (D-026) are filled lighter beneath the full-strength
                // fill, which leaves them out. A surface line separates the layers.
                const edge = edgePaths(points, py);
                return (
                  <g key={key}>
                    {data.x.partial && (
                      <path d={fill(points, present)} data-partial="" style={{ fill: color, opacity: "var(--chart-partial-opacity)" }} />
                    )}
                    <path d={fill(points, (p) => present(p) && !p.partial)} style={{ fill: color }} />
                    <path d={`${edge.solid}${edge.dashed}` || undefined} style={{ fill: "none", stroke: "var(--background)", strokeWidth: 2 }} />
                  </g>
                );
              }
              const { solid, dashed } = edgePaths(points, py);
              const stroke = { fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" } as const;
              return (
                <g key={key}>
                  <path d={fill(points, present)} style={{ fill: color, opacity: "var(--chart-area-opacity)" }} />
                  <path d={solid || undefined} style={stroke} />
                  {dashed && <path d={dashed} data-partial="" style={{ ...stroke, strokeDasharray: "var(--chart-partial-dash)" }} />}
                  {/* A value between two gaps has no area, so it gets a dot. */}
                  {points.map((p, j) =>
                    p.y !== null && points[j - 1]?.y == null && points[j + 1]?.y == null ? (
                      <circle key={j} cx={p.x} cy={py(p.y)} r={2.5} style={{ fill: color }} />
                    ) : null,
                  )}
                </g>
              );
            })}
          </>
        );
      }}
    </ChartFrame>
  );
}

// Missing values stack as 0 (D-021). The default offset stacks from zero in
// series order; unlike bars, areas don't use the diverging offset, whose bands
// would cross where a value changes sign (D-027).
function stackLayers(data: CartesianData): Layer[] {
  const layout = stack<number, number>()
    .keys(data.series.map((_, i) => i))
    .value((category, series) => data.series[series]?.values[category] ?? 0);
  return layout(data.x.values.map((_, i) => i)).map((layer) => ({
    lower: layer.map(([from]) => from),
    upper: layer.map(([, to]) => to),
  }));
}
