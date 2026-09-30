import { Chart } from "@/components/charts/chart";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { ChartData } from "@/lib/data/prepare";
import type { ChartSpec } from "@/lib/spec";

type ChartAreaProps = {
  // The data is loading, or a renderChart call is streaming.
  pending: boolean;
  chart: { spec: ChartSpec; data: ChartData; dataset: DatasetMeta } | null;
  // For the empty state's attribution; the chart frame shows it otherwise.
  dataset: DatasetMeta;
  // Suggested requests for the empty state; none for an upload.
  examples: readonly string[];
};

// Skeleton, chart or empty state. It knows nothing about chat: a failed tool
// call simply leaves the previous chart, or the empty state, in place.
export function ChartArea({ pending, chart, dataset, examples }: ChartAreaProps) {
  if (pending) {
    return (
      <div aria-busy="true" aria-label="Drawing the chart" className="flex flex-col gap-3">
        <div className="h-6 w-2/3 rounded bg-border motion-safe:animate-pulse" />
        <div className="h-[360px] rounded-lg bg-surface motion-safe:animate-pulse" />
      </div>
    );
  }
  if (chart) return <Chart spec={chart.spec} data={chart.data} dataset={chart.dataset} />;
  return (
    <div className="flex h-[360px] flex-col justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted">
      <p className="text-base text-foreground">No chart yet.</p>
      {examples.length > 0 ? (
        <>
          <p>Try asking for:</p>
          <ul className="list-disc pl-5">
            {examples.map((example) => (
              <li key={example}>“{example}”</li>
            ))}
          </ul>
        </>
      ) : (
        <p>Ask for a chart of your data.</p>
      )}
      {dataset.attribution && <p className="mt-auto text-xs">{dataset.attribution}</p>}
    </div>
  );
}
