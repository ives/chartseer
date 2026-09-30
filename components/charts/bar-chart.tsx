import type { ReactNode } from "react";
import { type ScaleBand, scaleBand, scaleLinear } from "d3-scale";
import { stack, stackOffsetDiverging } from "d3-shape";
import type { Annotation, ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { CartesianData } from "@/lib/data/prepare";
import { AnnotationLayer, type Span } from "./annotation-layer";
import { BarMarks } from "./bar-marks";
import { type Axes, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";
import { barTooltip } from "./tooltip-content";
import { partialNote } from "./partial-note";
import { valueDomain } from "./value-domain";

type BarChartProps = {
  spec: Extract<ChartSpec, { type: "bar" }>;
  data: CartesianData;
  dataset: DatasetMeta;
  description: string;
  table: ReactNode;
  specView: ReactNode;
};

// One drawn bar or stacked segment, in data units along the value axis.
type Segment = { category: number; series: number; from: number; to: number };
// The same, in pixels, as drawn and as hit-tested.
export type BarRect = { key: string; category: number; series: number; x: number; y: number; width: number; height: number; partial: boolean };

const VERTICAL_HEIGHT = 360;
const ROW_HEIGHT = 28;
const FRAME_ROWS_EXTRA = 80; // The frame's top and bottom margins, plus a little air.
const MAX_THICKNESS = 24;
const GAP = 2; // Surface gap between touching bars and stacked segments.

export function BarChart({ spec, data, dataset, description, table, specView }: BarChartProps) {
  const horizontal = spec.orientation === "horizontal";
  const stacked = spec.layout === "stacked" && data.series.length > 1;
  const categories = data.x.values.map(String);
  const segments = stacked ? stackSegments(data) : groupedSegments(data);
  const domain = valueDomain(segments.flatMap((s) => [s.from, s.to]));

  const axes = (inner: Inner): Axes => {
    const band = scaleBand()
      .domain(categories)
      .range([0, horizontal ? inner.height : inner.width])
      .padding(0.2);
    const value = scaleLinear()
      .domain(domain)
      .range(horizontal ? [0, inner.width] : [inner.height, 0])
      .nice();
    const categoryAxis = { kind: "band", scale: band, label: data.x.label, unit: data.x.timeUnit } as const;
    const valueAxis = { kind: "linear", scale: value, label: data.y.label, grid: true } as const;
    return horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis };
  };

  const height = horizontal ? Math.max(200, categories.length * ROW_HEIGHT + FRAME_ROWS_EXTRA) : VERTICAL_HEIGHT;
  const perBand = stacked ? 1 : data.series.length;

  return (
    <ChartFrame
      title={spec.title}
      subtitle={spec.subtitle}
      legend={{
        title: data.seriesLabel,
        items: data.series.map((s, i) => ({ label: s.label, color: seriesColor(i) })),
      }}
      dataset={dataset}
      note={partialNote(data, "Lighter")}
      description={description}
      table={table}
      specView={specView}
      height={height}
      axes={axes}
      hover={(pointer, scales) => {
        const hit = rectsFor(scales)?.find((r) => contains(r, pointer));
        if (!hit) return null;
        return {
          content: barTooltip(data, hit.category, hit.series, stacked, seriesColor),
          marker: (
            <rect
              x={hit.x - 1}
              y={hit.y - 1}
              width={hit.width + 2}
              height={hit.height + 2}
              style={{ fill: "none", stroke: "var(--foreground)", strokeWidth: 1.5 }}
            />
          ),
        };
      }}
    >
      {(scales, inner) => {
        const categoryAxis = horizontal ? scales.y : scales.x;
        const rects = rectsFor(scales);
        if (categoryAxis.kind !== "band" || !rects) return null;
        const band = categoryAxis.scale;
        return (
          <>
            <AnnotationLayer
              annotations={data.annotations}
              locate={(a) => locate(band, a)}
              axis={horizontal ? "y" : "x"}
              inner={inner}
            />
            <BarMarks rects={rects} trigger={data} />
          </>
        );
      }}
    </ChartFrame>
  );

  // Every bar and segment in pixels, for drawing and for hit-testing alike.
  function rectsFor(scales: Axes): BarRect[] | null {
    const categoryAxis = horizontal ? scales.y : scales.x;
    const valueAxis = horizontal ? scales.x : scales.y;
    if (categoryAxis.kind !== "band" || valueAxis.kind !== "linear") return null;
    const band = categoryAxis.scale;
    const value = valueAxis.scale;

    // Bars are capped in thickness and centred in their band; grouped bars
    // sit side by side with a surface gap between them.
    const groupThickness = Math.min(band.bandwidth(), MAX_THICKNESS * perBand + GAP * (perBand - 1));
    const thickness = Math.max(1, (groupThickness - GAP * (perBand - 1)) / perBand);
    const inset = (band.bandwidth() - groupThickness) / 2;

    return segments.flatMap((s) => {
      const category = categories[s.category];
      if (category === undefined) return [];
      const across = (band(category) ?? 0) + inset + (stacked ? 0 : s.series * (thickness + GAP));
      // Each stacked segment gives up GAP pixels at its far end.
      const [a, b] = [value(s.from), value(s.to)];
      const length = Math.max(0, Math.abs(b - a) - (stacked ? GAP : 0));
      if (length === 0) return [];
      const partial = data.x.partial?.[s.category] ?? false;
      const key = `${s.category}-${s.series}`;
      const common = { key, category: s.category, series: s.series, partial };
      return horizontal
        ? [{ ...common, x: b >= a ? a : a - length, width: length, y: across, height: thickness }]
        : [{ ...common, x: across, width: thickness, y: b < a ? a - length : a, height: length }];
    });
  }
}

// Inside a bar, with a little slack so a 1px bar can still be hovered.
function contains(r: BarRect, p: { x: number; y: number }): boolean {
  const slack = 2;
  return p.x >= r.x - slack && p.x <= r.x + r.width + slack && p.y >= r.y - slack && p.y <= r.y + r.height + slack;
}

function groupedSegments(data: CartesianData): Segment[] {
  return data.series.flatMap((s, series) =>
    s.values.flatMap((v, category) => (v === null ? [] : [{ category, series, from: 0, to: v }])),
  );
}

// Missing values stack as 0 (D-021); negatives stack below the baseline.
function stackSegments(data: CartesianData): Segment[] {
  const layout = stack<number, number>()
    .keys(data.series.map((_, i) => i))
    .value((category, series) => data.series[series]?.values[category] ?? 0)
    .offset(stackOffsetDiverging);
  return layout(data.x.values.map((_, i) => i)).flatMap((layer) =>
    layer.map(([from, to], category) => ({ category, series: layer.key, from, to })),
  );
}

// Annotations name categories; a range runs from the start of one band to the end of another.
function locate(band: ScaleBand<string>, annotation: Annotation): Span | null {
  if (annotation.kind === "point") {
    const at = band(String(annotation.x));
    if (at === undefined) return null;
    const centre = at + band.bandwidth() / 2;
    return { start: centre, end: centre };
  }
  const [from, to] = [band(String(annotation.from)), band(String(annotation.to))];
  if (from === undefined || to === undefined) return null;
  return { start: Math.min(from, to), end: Math.max(from, to) + band.bandwidth() };
}
