import { Icon, type IconName } from "@/components/landing/icon";
import type { ChartSpec } from "@/lib/spec";

// Where a drawn chart stands: on screen, reachable by undo and redo, or
// replaced by a new chart after an undo (D-044, task 03).
export type ChipState = "current" | "reachable" | "replaced";

type ChartChipProps = {
  // The chart's number in order of drawing, from 1. It never changes.
  n: number;
  spec: ChartSpec;
  state: ChipState;
  // False while a request is in flight, as for undo and redo.
  canShow: boolean;
  onShow: () => void;
};

const BASE =
  "inline-flex max-w-full min-h-11 items-center gap-2 self-start rounded-[10px] border py-1 pr-3 pl-2 text-left text-[13px] md:min-h-9";

// The line that ends a reply which drew a chart. Clicking it shows that chart.
export function ChartChip({ n, spec, state, canShow, onShow }: ChartChipProps) {
  const label = (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex size-[22px] flex-none items-center justify-center rounded-md ${
          state === "current" ? "bg-accent text-accent-foreground" : "bg-surface-track text-secondary"
        }`}
      >
        <Icon name={chartIcon(spec.type)} size={13} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 truncate md:whitespace-normal">
        <span className={state === "current" ? "text-accent-strong" : "text-muted"}>Chart {n} ·</span> {spec.title}
        {state === "replaced" && <span className="sr-only"> (replaced)</span>}
      </span>
    </>
  );
  // A replaced chart can't be reached any more, so it isn't a control.
  if (state === "replaced") {
    return <span className={`${BASE} border-dashed border-border bg-transparent text-muted`}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={onShow}
      disabled={!canShow}
      aria-current={state === "current" ? "true" : undefined}
      className={`${BASE} disabled:cursor-default ${
        state === "current"
          ? "border-accent-soft-border bg-accent-soft text-accent-strong"
          : "border-border-card bg-card text-foreground hover:border-border-strong"
      }`}
    >
      {label}
    </button>
  );
}

function chartIcon(type: ChartSpec["type"]): IconName {
  switch (type) {
    case "line":
      return "chart-line";
    case "area":
      return "chart-area";
    case "bar":
      return "chart-bar";
    case "scatter":
      return "chart-scatter";
    default: {
      const unreachable: never = type;
      throw new Error(`Unknown chart type: ${String(unreachable)}`);
    }
  }
}
