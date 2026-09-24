import { scaleLinear, scalePoint, scaleUtc } from "d3-scale";
import { line } from "d3-shape";
import type { Annotation, ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import { isoToUtcDate } from "@/lib/data/dates";
import type { CartesianData, XValue } from "@/lib/data/prepare";
import { AnnotationLayer, type Span } from "./annotation-layer";
import { type Axes, type Axis, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";
import { valueDomain } from "./value-domain";

type LineChartProps = {
  spec: Extract<ChartSpec, { type: "line" }>;
  data: CartesianData;
  dataset: DatasetMeta;
};

type Point = { x: number; y: number | null };

const HEIGHT = 360;

export function LineChart({ spec, data, dataset }: LineChartProps) {
  const axes = (inner: Inner): Axes => ({
    x: xAxis(data, inner.width),
    y: {
      kind: "linear",
      scale: scaleLinear()
        .domain(valueDomain(data.series.flatMap((s) => s.values)))
        .range([inner.height, 0])
        .nice(),
      label: data.y.label,
      grid: true,
    },
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
      height={HEIGHT}
      axes={axes}
    >
      {({ x, y }, inner) => {
        const px = (value: XValue) => position(x, value);
        const py = (value: number) => (y.kind === "linear" ? y.scale(value) : 0);
        const path = line<Point>()
          .defined((p) => p.y !== null)
          .x((p) => p.x)
          .y((p) => py(p.y ?? 0));
        return (
          <>
            <AnnotationLayer
              annotations={data.annotations}
              locate={(a) => locate(x, a)}
              axis="x"
              inner={inner}
            />
            {data.series.map((s, i) => {
              const points: Point[] = data.x.values.map((value, j) => ({ x: px(value) ?? 0, y: s.values[j] ?? null }));
              const color = seriesColor(i);
              return (
                <g key={String(s.key)}>
                  <path
                    d={path(points) ?? undefined}
                    style={{ fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }}
                  />
                  {/* A value between two gaps has no line segment, so it gets a dot. */}
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

// The x scale follows the column kind: dates on a UTC time axis, numbers on a
// linear one, categories evenly spaced.
function xAxis(data: CartesianData, width: number): Axis {
  const label = data.x.label;
  switch (data.x.kind) {
    case "date": {
      const times = data.x.values.map((v) => isoToUtcDate(String(v)).getTime());
      const domain = [new Date(Math.min(...times)), new Date(Math.max(...times))];
      return { kind: "time", scale: scaleUtc().domain(domain).range([0, width]), label };
    }
    case "number": {
      const numbers = data.x.values.map(Number);
      return { kind: "linear", scale: scaleLinear().domain([Math.min(...numbers), Math.max(...numbers)]).range([0, width]), label };
    }
    case "category":
    case "text":
      return { kind: "point", scale: scalePoint().domain(data.x.values.map(String)).range([0, width]).padding(0.5), label };
    default: {
      const unreachable: never = data.x.kind;
      throw new Error(`Unknown column kind: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Pixel position of an x value, or null if it isn't on the axis.
function position(axis: Axis, value: XValue): number | null {
  switch (axis.kind) {
    case "time":
      return axis.scale(isoToUtcDate(String(value)));
    case "linear":
      return axis.scale(Number(value));
    case "point":
    case "band":
      return axis.scale(String(value)) ?? null;
    default: {
      const unreachable: never = axis;
      throw new Error(`Unknown axis: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Continuous axes clamp a range to the plot and drop anything wholly outside it.
function locate(axis: Axis, annotation: Annotation): Span | null {
  const [lo, hi] = [0, axisLength(axis)];
  if (annotation.kind === "point") {
    const at = position(axis, annotation.x);
    return at === null || !Number.isFinite(at) || at < lo || at > hi ? null : { start: at, end: at };
  }
  const [from, to] = [position(axis, annotation.from), position(axis, annotation.to)];
  if (from === null || to === null || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  const [start, end] = [Math.max(lo, Math.min(from, to)), Math.min(hi, Math.max(from, to))];
  return start > end ? null : { start, end };
}

function axisLength(axis: Axis): number {
  const [a = 0, b = 0] = axis.scale.range();
  return Math.abs(b - a);
}
