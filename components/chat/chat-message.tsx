import type { ChartSpec } from "@/lib/spec";
import { ChartChip, type ChipState } from "./chart-chip";
import { type ChartseerMessage, backToIn, textOf } from "./messages";

// The charts one reply drew, each with its index in the chart history.
export type DrawnChart = { index: number; spec: ChartSpec };

// How the chips find and show charts in the history (D-044).
export type ChartLinks = {
  // The shown chart's index, if any.
  shown: number | undefined;
  // Indices undo and redo can still reach.
  reachable: readonly number[];
  canShow: boolean;
  onShow: (index: number) => void;
};

// Text, then a chip for each chart drawn; failed attempts show nothing, as
// the model's own words explain them.
export function ChatMessage({ message, drawn, links }: { message: ChartseerMessage; drawn: DrawnChart[]; links: ChartLinks }) {
  const text = textOf(message);
  if (message.role === "user") {
    const backTo = backToIn(message);
    return (
      <li className="flex max-w-[88%] flex-col items-end gap-1 self-end md:max-w-[86%]">
        {backTo && (
          <p className="text-xs text-muted">
            <span aria-hidden="true">↩ </span>Back to: {backTo.title}
          </p>
        )}
        <p className="rounded-[15px_15px_4px_15px] bg-ink px-3.5 py-2.5 text-sm leading-[1.45] whitespace-pre-wrap text-on-ink md:rounded-[16px_16px_4px_16px] md:px-[15px] md:py-[11px]">
          <span className="sr-only">You: </span>
          {text}
        </p>
      </li>
    );
  }
  if (!text && drawn.length === 0) return null;
  return (
    <li className="flex max-w-full flex-col gap-2.5 text-sm leading-relaxed md:max-w-[94%]">
      <span className="sr-only">Chartseer: </span>
      {text && <p className="whitespace-pre-wrap">{text}</p>}
      {drawn.map(({ index, spec }) => (
        <ChartChip
          key={index}
          n={index + 1}
          spec={spec}
          state={chipState(index, links)}
          canShow={links.canShow}
          onShow={() => links.onShow(index)}
        />
      ))}
    </li>
  );
}

function chipState(index: number, { shown, reachable }: ChartLinks): ChipState {
  if (index === shown) return "current";
  return reachable.includes(index) ? "reachable" : "replaced";
}
