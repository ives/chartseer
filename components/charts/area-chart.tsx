import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import { stack } from "d3-shape";
import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { CartesianData } from "@/lib/data/prepare";
import { AnnotationLayer } from "./annotation-layer";
import { AreaMarks } from "./area-marks";
import { locate, seriesPoints, xAxis } from "./cartesian";
import { type Axes, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";
import { snapHover } from "./snap-hover";
import { partialNote } from "./partial-note";
import { valueDomain } from "./value-domain";

type AreaChartProps = {
  spec: Extract<ChartSpec, { type: "area" }>;
  data: CartesianData;
  dataset: DatasetMeta;
  description: string;
  table: ReactNode;
  specView: ReactNode;
};

// One layer of the chart: its bottom and top edge at each x value, in data units.
type Layer = { lower: (number | null)[]; upper: (number | null)[] };

const HEIGHT = 360;

export function AreaChart({ spec, data, dataset, description, table, specView }: AreaChartProps) {
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
      specView={specView}
      height={HEIGHT}
      axes={axes}
      hover={(pointer, { x, y }, inner) =>
        y.kind === "linear"
          ? snapHover(data, x, pointer, inner, (series, index) => {
              // A stacked area's dot sits on top of its layer.
              if ((data.series[series]?.values[index] ?? null) === null) return null;
              return y.scale(layers[series]?.upper[index] ?? 0);
            })
          : null
      }
    >
      {({ x, y }, inner) => {
        const py = (value: number) => (y.kind === "linear" ? y.scale(value) : 0);
        return (
          <>
            <AnnotationLayer
              annotations={data.annotations}
              locate={(a) => locate(x, a)}
              axis="x"
              inner={inner}
            />
            <AreaMarks
              stacked={stacked}
              trigger={data}
              layers={layers.map((layer, i) => ({
                key: String(data.series[i]?.key ?? i),
                color: seriesColor(i),
                points: seriesPoints(data, layer.upper, x).map((p, j) => ({
                  ...p,
                  y: p.y === null ? null : py(p.y),
                  lower: py(layer.lower[j] ?? 0),
                })),
              }))}
            />
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
