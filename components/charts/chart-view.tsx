import type { ChartSpec } from "@/lib/spec";
import type { DatasetMeta } from "@/lib/data/datasets";
import { describeChart } from "@/lib/data/describe";
import type { ChartData } from "@/lib/data/prepare";
import { AreaChart } from "./area-chart";
import { BarChart } from "./bar-chart";
import { ChartSpecView } from "./chart-spec-view";
import { ChartTable } from "./chart-table";
import { LineChart } from "./line-chart";
import { ScatterChart } from "./scatter-chart";

export type ChartProps = {
  // A spec that has passed parseSpec, and prepareChartData's output for it.
  spec: ChartSpec;
  data: ChartData;
  dataset: DatasetMeta;
};

// The renderer for the spec's type. Chart wraps it with the crossfade (D-053).
export function ChartView({ spec, data, dataset }: ChartProps) {
  // Every chart carries a text description, a table view (D-029) and its spec (D-058).
  const description = describeChart(spec, data);
  const table = <ChartTable title={spec.title} data={data} />;
  const specView = <ChartSpecView spec={spec} />;
  switch (spec.type) {
    case "line":
      if (data.type !== "line") throw mismatch(spec, data);
      return <LineChart spec={spec} data={data} dataset={dataset} description={description} table={table} specView={specView} />;
    case "area":
      if (data.type !== "area") throw mismatch(spec, data);
      return <AreaChart spec={spec} data={data} dataset={dataset} description={description} table={table} specView={specView} />;
    case "bar":
      if (data.type !== "bar") throw mismatch(spec, data);
      return <BarChart spec={spec} data={data} dataset={dataset} description={description} table={table} specView={specView} />;
    case "scatter":
      if (data.type !== "scatter") throw mismatch(spec, data);
      return <ScatterChart spec={spec} data={data} dataset={dataset} description={description} table={table} specView={specView} />;
    default: {
      const unreachable: never = spec;
      throw new Error(`Unknown chart type: ${JSON.stringify(unreachable)}`);
    }
  }
}

function mismatch(spec: ChartSpec, data: ChartData): Error {
  return new Error(`A ${spec.type} spec was given ${data.type} data`);
}
