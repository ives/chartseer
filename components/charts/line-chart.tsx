import type { ReactNode } from "react";
import { scaleLinear } from "d3-scale";
import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { CartesianData } from "@/lib/data/prepare";
import { AnnotationLayer } from "./annotation-layer";
import { locate, seriesPoints, xAxis } from "./cartesian";
import { type Axes, ChartFrame, type Inner } from "./chart-frame";
import { seriesColor } from "./colors";
import { LineMarks } from "./line-marks";
import { snapHover } from "./snap-hover";
import { partialNote } from "./partial-note";
import { valueDomain } from "./value-domain";

type LineChartProps = {
  spec: Extract<ChartSpec, { type: "line" }>;
  data: CartesianData;
  dataset: DatasetMeta;
  description: string;
  table: ReactNode;
  specView: ReactNode;
};

const HEIGHT = 360;

export function LineChart({ spec, data, dataset, description, table, specView }: LineChartProps) {
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
      specView={specView}
      height={HEIGHT}
      axes={axes}
      hover={(pointer, { x, y }, inner) =>
        y.kind === "linear"
          ? snapHover(data, x, pointer, inner, (series, index) => {
              const value = data.series[series]?.values[index] ?? null;
              return value === null ? null : y.scale(value);
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
            <LineMarks
              series={data.series.map((s, i) => ({
                key: String(s.key),
                color: seriesColor(i),
                points: seriesPoints(data, s.values, x).map((p) => ({ ...p, y: p.y === null ? null : py(p.y) })),
              }))}
              trigger={data}
            />
          </>
        );
      }}
    </ChartFrame>
  );
}
