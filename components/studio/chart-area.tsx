import { Chart } from "@/components/charts/chart";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { ChartData } from "@/lib/data/prepare";
import type { ChartSpec } from "@/lib/spec";

// Undo and redo through the charts drawn so far (D-044).
export type ChartStepsControls = {
  canUndo: boolean;
  canRedo: boolean;
  // Read out after an undo or redo, e.g. "Showing chart 2 of 4: …".
  announcement: string;
  onUndo: () => void;
  onRedo: () => void;
};

type ChartAreaProps = {
  // The data is loading, or a renderChart call is streaming.
  pending: boolean;
  chart: { spec: ChartSpec; data: ChartData; dataset: DatasetMeta } | null;
  // For the empty state's attribution; the chart frame shows it otherwise.
  dataset: DatasetMeta;
  // Suggested requests for the empty state; none for an upload.
  examples: readonly string[];
  steps: ChartStepsControls;
};

const BUTTON =
  "rounded-md border border-border px-2 py-0.5 focus-visible:outline-2 focus-visible:outline-foreground disabled:opacity-40";

// Skeleton, chart or empty state. It knows nothing about chat: a failed tool
// call simply leaves the previous chart, or the empty state, in place.
export function ChartArea({ pending, chart, dataset, examples, steps }: ChartAreaProps) {
  return (
    <>
      {pending ? (
        <div aria-busy="true" aria-label="Drawing the chart" className="flex flex-col gap-3">
          <div className="h-6 w-2/3 rounded bg-border motion-safe:animate-pulse" />
          <div className="h-[360px] rounded-lg bg-surface motion-safe:animate-pulse" />
        </div>
      ) : chart ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              disabled={!steps.canUndo}
              onClick={steps.onUndo}
              aria-keyshortcuts="Control+Z Meta+Z"
              title="Undo (Ctrl/Cmd+Z)"
              className={BUTTON}
            >
              Undo
            </button>
            <button
              type="button"
              disabled={!steps.canRedo}
              onClick={steps.onRedo}
              aria-keyshortcuts="Shift+Control+Z Shift+Meta+Z"
              title="Redo (Shift+Ctrl/Cmd+Z)"
              className={BUTTON}
            >
              Redo
            </button>
          </div>
          <Chart spec={chart.spec} data={chart.data} dataset={chart.dataset} />
        </div>
      ) : (
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
      )}
      {/* Always mounted, so a change is announced. */}
      <p role="status" className="sr-only">
        {steps.announcement}
      </p>
    </>
  );
}
