import type { TooltipContent } from "./tooltip-content";

type ChartTooltipProps = {
  content: TooltipContent;
  // The pointer, in pixels from the top left of the plot's container.
  x: number;
  y: number;
  // The container's width, so the tooltip can flip to stay inside it.
  width: number;
};

const OFFSET = 14;
const MAX_WIDTH = 240;

// Hover and tap only. It repeats what the table view gives keyboard and screen
// reader users, so it is hidden from assistive technology, and it never takes
// the pointer, so it can't cover anything that needs a click (D-052).
export function ChartTooltip({ content, x, y, width }: ChartTooltipProps) {
  const flip = x + OFFSET + MAX_WIDTH > width;
  return (
    <div
      aria-hidden="true"
      data-chart-tooltip=""
      className="pointer-events-none absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-background px-2.5 py-2 text-xs shadow-md"
      style={{
        maxWidth: MAX_WIDTH,
        top: Math.max(0, y - OFFSET),
        ...(flip ? { right: Math.max(0, width - x + OFFSET) } : { left: x + OFFSET }),
      }}
    >
      {content.title && <p className="font-semibold">{content.title}</p>}
      {content.heading && <p className="text-muted">{content.heading}</p>}
      <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        {content.rows.map((row, i) => (
          <div key={i} className="contents">
            <dt className="flex items-center gap-1.5">
              {row.color && <span className="inline-block size-2 rounded-sm" style={{ background: row.color }} />}
              {row.label}
            </dt>
            <dd className="text-right tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      {content.note && <p className="text-muted">{content.note}</p>}
    </div>
  );
}
