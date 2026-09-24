import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { ChartData } from "@/lib/data/prepare";
import { BarChart } from "./bar-chart";
import { LineChart } from "./line-chart";

type ChartProps = {
  // A spec that has passed parseSpec, and prepareChartData's output for it.
  spec: ChartSpec;
  data: ChartData;
  dataset: DatasetMeta;
};

export function Chart({ spec, data, dataset }: ChartProps) {
  switch (spec.type) {
    case "line":
      if (data.type !== "line") throw mismatch(spec, data);
      return <LineChart spec={spec} data={data} dataset={dataset} />;
    case "bar":
      if (data.type !== "bar") throw mismatch(spec, data);
      return <BarChart spec={spec} data={data} dataset={dataset} />;
    case "area":
    case "scatter":
      // Placeholder until these renderers exist; the attribution still shows.
      return (
        <figure className="flex flex-col gap-3">
          <figcaption className="text-base font-semibold">{spec.title}</figcaption>
          <p className="rounded border border-dashed p-6 text-center text-sm opacity-70">
            {spec.type === "area" ? "Area" : "Scatter"} charts are not built yet.
          </p>
          <footer className="flex flex-col gap-0.5 text-xs opacity-70">
            <p>{dataset.attribution}</p>
            {dataset.note && <p>{dataset.note}</p>}
          </footer>
        </figure>
      );
    default: {
      const unreachable: never = spec;
      throw new Error(`Unknown chart type: ${JSON.stringify(unreachable)}`);
    }
  }
}

function mismatch(spec: ChartSpec, data: ChartData): Error {
  return new Error(`A ${spec.type} spec was given ${data.type} data`);
}
