import { useState } from "react";
import { Chart } from "@/components/charts/chart";
import { ChartChromeContext, type ChartViewMode } from "@/components/charts/chart-chrome";
import { Icon } from "@/components/landing/icon";
import type { DatasetMeta } from "@/lib/data/datasets";
import type { EmptyChart } from "@/lib/data/empty";
import { Attribution } from "./attribution";
import { DownloadButtons } from "./download-buttons";
import { ViewSwitch } from "./view-switch";
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
  // The shown chart's number in order of drawing, and how many have been
  // drawn, for the line above the title. Its chip in the chat has the same number.
  shown: number;
  drawn: number;
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

const TOOL_BUTTON =
  "inline-flex size-11 items-center justify-center gap-1.5 rounded-[11px] border border-border bg-card text-[13px] font-medium hover:border-border-strong disabled:border-border-card disabled:text-muted disabled:opacity-60 md:size-auto md:min-h-10 md:rounded-[10px] md:px-3";
const SECONDARY_BUTTON =
  "min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:border-border-strong disabled:opacity-40 md:min-h-10";

// Skeleton, chart or empty state, with the chart toolbar. It knows nothing
// about chat: a failed tool call simply leaves the previous chart, or the
// empty state, in place.
export function ChartArea({ pending, chart, dataset, starters, canAsk, onAsk, steps }: ChartAreaProps) {
  // Chart, table or spec; it stays as chosen when the chart changes.
  const [view, setView] = useState<ChartViewMode>("chart");
  return (
    <>
      {pending ? (
        <div aria-busy="true" aria-label="Drawing the chart" className="flex flex-col gap-3">
          <div className="h-11 w-48 rounded-[11px] bg-surface-track motion-safe:animate-pulse md:h-10" />
          <div className="mt-4 h-3 w-32 rounded bg-surface-track motion-safe:animate-pulse md:mt-6" />
          <div className="h-7 w-2/3 rounded-md bg-surface-track motion-safe:animate-pulse" />
          <div className="mt-2 h-[280px] rounded-xl bg-surface-track motion-safe:animate-pulse md:h-[360px]" />
        </div>
      ) : chart ? (
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            {/* A chart with nothing to draw has no table or spec to show (D-046). */}
            {chart.empty ? <span /> : <ViewSwitch view={view} onChange={setView} />}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <button
                type="button"
                disabled={!steps.canUndo}
                onClick={steps.onUndo}
                aria-label="Undo"
                aria-keyshortcuts="Control+Z Meta+Z"
                title="Undo (Ctrl/Cmd+Z)"
                className={TOOL_BUTTON}
              >
                <Icon name="undo" size={16} />
                <span className="max-md:sr-only">Undo</span>
              </button>
              <button
                type="button"
                disabled={!steps.canRedo}
                onClick={steps.onRedo}
                aria-label="Redo"
                aria-keyshortcuts="Shift+Control+Z Shift+Meta+Z"
                title="Redo (Shift+Ctrl/Cmd+Z)"
                className={TOOL_BUTTON}
              >
                <Icon name="redo" size={16} />
                <span className="max-md:sr-only">Redo</span>
              </button>
              {!chart.empty && (
                // On a phone the downloads sit under the chart instead.
                <div className="contents max-md:hidden">
                  <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
                  <DownloadButtons chart={chart} layout="joined" />
                </div>
              )}
            </div>
          </div>
          {/* Visual only: the step is announced once, by the status line below. */}
          <p aria-hidden="true" className="mt-5 mb-1 font-mono text-[11px] tracking-[0.02em] text-muted md:mt-7 md:mb-1.5 md:text-xs">
            Chart {steps.shown} of {steps.drawn} · {chartTypeName(chart.spec.type)}
          </p>
          {chart.empty ? (
            // A message in the chart's place, not blank axes.
            <div className="flex flex-col gap-3 text-sm">
              <h2 className="font-serif text-[21px] leading-tight font-semibold tracking-[-0.01em] md:text-[28px]">{chart.spec.title}</h2>
              <div className="flex min-h-[280px] flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-border-strong p-6 md:min-h-[320px]">
                <p className="max-w-prose">{chart.empty.message}</p>
                {chart.empty.kind === "filter" && (
                  <button
                    type="button"
                    disabled={!canAsk}
                    onClick={() => chart.empty?.kind === "filter" && onAsk(chart.empty.request)}
                    className={SECONDARY_BUTTON}
                  >
                    Ask Chartseer to fix it
                  </button>
                )}
              </div>
              <Attribution dataset={chart.dataset} />
            </div>
          ) : (
            <ChartChromeContext
              value={{
                view,
                actions: (
                  <div className="mt-1 md:hidden">
                    <DownloadButtons chart={chart} layout="split" />
                  </div>
                ),
              }}
            >
              <Chart spec={chart.spec} data={chart.data} dataset={chart.dataset} />
            </ChartChromeContext>
          )}
        </div>
      ) : (
        <div className="flex min-h-[360px] flex-1 flex-col gap-3 text-sm text-secondary">
          <div className="flex flex-1 flex-col justify-center gap-3 py-6">
            <p className="font-serif text-[21px] leading-tight font-semibold text-foreground md:text-[28px]">No chart yet.</p>
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
                        className="min-h-11 rounded-full border border-border bg-card px-4 py-2 text-left text-sm text-foreground hover:border-border-strong disabled:opacity-40 md:min-h-9 md:py-1.5"
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
          </div>
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

function chartTypeName(type: ChartSpec["type"]): string {
  switch (type) {
    case "line":
      return "Line chart";
    case "area":
      return "Area chart";
    case "bar":
      return "Bar chart";
    case "scatter":
      return "Scatter plot";
    default: {
      const unreachable: never = type;
      throw new Error(`Unknown chart type: ${String(unreachable)}`);
    }
  }
}
