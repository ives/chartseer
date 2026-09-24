import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { CartesianData } from "@/lib/data/prepare";
import { AnnotationLayer } from "./annotation-layer";
import { edgePaths, locate, seriesPoints, xAxis } from "./cartesian";
import { type Axes, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";
import { partialNote } from "./partial-note";
import { valueDomain } from "./value-domain";

type LineChartProps = {
  spec: Extract<ChartSpec, { type: "line" }>;
  data: CartesianData;
  dataset: DatasetMeta;
  description: string;
  table: ReactNode;
};

const HEIGHT = 360;

export function LineChart({ spec, data, dataset, description, table }: LineChartProps) {
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
      note={partialNote(data, "Dashed")}
      description={description}
      table={table}
      height={HEIGHT}
      axes={axes}
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
            {data.series.map((s, i) => {
              const points = seriesPoints(data, s.values, x);
              const color = seriesColor(i);
              const stroke = { fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" } as const;
              // Partial buckets (D-026) are left out of the solid line and
              // joined to their neighbours by a dashed one.
              const { solid, dashed } = edgePaths(points, py);
              return (
                <g key={String(s.key)}>
                  <path d={solid || undefined} style={stroke} />
                  {dashed && (
                    <path d={dashed} data-partial="" style={{ ...stroke, strokeDasharray: "var(--chart-partial-dash)" }} />
                  )}
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
