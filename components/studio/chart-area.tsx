import { Chart } from "@/components/charts/chart";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { EmptyChart } from "@/lib/data/empty";
import { Attribution } from "./attribution";
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
  // `empty` says why a valid chart has nothing to draw (D-046).
  chart: { spec: ChartSpec; data: ChartData; dataset: DatasetMeta; empty: EmptyChart | null } | null;
  // For the empty state's attribution; the chart frame shows it otherwise.
  dataset: DatasetMeta;
  // Requests offered as chips before the first chart (D-045).
  starters: readonly string[];
  // Whether a chip or the fix button can send now.
  canAsk: boolean;
  // Sends a request into the chat, as if the user had typed it.
  onAsk: (text: string) => void;
  steps: ChartStepsControls;
};

const BUTTON =
  "rounded-md border border-border px-2 py-0.5 disabled:opacity-40";

// Skeleton, chart or empty state. It knows nothing about chat: a failed tool
// call simply leaves the previous chart, or the empty state, in place.
export function ChartArea({ pending, chart, dataset, starters, canAsk, onAsk, steps }: ChartAreaProps) {
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
          {chart.empty ? (
            // A message in the chart's place, not blank axes.
            <div className="flex min-h-[360px] flex-col justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-sm">
              <h2 className="font-serif text-xl font-semibold tracking-tight">{chart.spec.title}</h2>
              <p>{chart.empty.message}</p>
              {chart.empty.kind === "filter" && (
                <p>
                  <button
                    type="button"
                    disabled={!canAsk}
                    onClick={() => chart.empty?.kind === "filter" && onAsk(chart.empty.request)}
                    className={BUTTON}
                  >
                    Ask Chartseer to fix it
                  </button>
                </p>
              )}
              <Attribution dataset={chart.dataset} />
            </div>
          ) : (
            <Chart spec={chart.spec} data={chart.data} dataset={chart.dataset} />
          )}
        </div>
      ) : (
        <div className="flex h-[360px] flex-col justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          <p className="text-base text-foreground">No chart yet.</p>
          {starters.length > 0 ? (
            <>
              <p id="starters-label">Try asking for:</p>
              <ul aria-labelledby="starters-label" className="flex flex-wrap gap-2">
                {starters.map((starter) => (
                  <li key={starter}>
                    <button
                      type="button"
                      disabled={!canAsk}
                      onClick={() => onAsk(starter)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-foreground hover:bg-surface disabled:opacity-40"
                    >
                      {starter}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Ask for a chart of your data.</p>
          )}
          <Attribution dataset={dataset} />
        </div>
      )}
      {/* Always mounted, so a change is announced. */}
      <p role="status" className="sr-only">
        {steps.announcement}
      </p>
    </>
  );
}
