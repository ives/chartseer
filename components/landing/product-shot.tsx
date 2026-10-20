import { HourlyBars } from "./hourly-bars";
import { Icon } from "./icon";

// A picture of the app, built as plain markup. It imports no chart or chat
// code, and reads as one image: its text is part of the picture, not content.
export function ProductShot() {
  return (
    <div
      role="img"
      aria-label="The Chartseer app: a bar chart of bike journeys by hour of day, with weekday peaks around 8am and 5pm, beside the chat message that asked for it"
      className="mt-12 flex w-full max-w-[1120px] flex-col overflow-hidden rounded-[18px] border border-border bg-card text-left shadow-lifted md:mt-[72px] md:flex-row md:flex-wrap md:rounded-[20px]"
    >
      <div className="min-w-0 px-4 pt-[18px] pb-3 md:flex-[3_1_624px] md:px-8 md:pt-7 md:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-lg leading-tight font-semibold tracking-[-0.01em] md:text-[22px]">
            Journeys by hour of day, weekday vs weekend
          </p>
          <div className="hidden gap-1.5 text-xs text-secondary md:flex">
            {["Table", "Spec", "SVG ↓"].map((label) => (
              <span key={label} className="rounded-lg border border-border px-2.5 py-[5px]">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3.5 text-xs text-secondary md:mt-3.5 md:gap-[18px] md:text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[var(--chart-1)] md:size-[9px] md:rounded-full" />
            Weekday
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[var(--chart-2)] md:size-[9px] md:rounded-full" />
            Weekend
          </span>
        </div>
        <HourlyBars layout="narrow" className="mt-2 text-[10px] md:hidden" />
        <HourlyBars layout="wide" className="mt-3 hidden text-[11px] md:block" />
        <p className="mt-1.5 hidden text-xs text-muted md:block">
          Hour of day · Santander Cycles sample, powered by TfL Open Data
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-3 border-t border-border-card bg-surface p-4 md:flex-[2_1_349px] md:gap-3.5 md:border-t-0 md:border-l md:p-6">
        <p className="max-w-[94%] self-end rounded-[14px_14px_4px_14px] bg-ink px-3.5 py-2.5 text-sm leading-[1.45] text-on-ink md:rounded-[16px_16px_4px_16px] md:px-4 md:py-3">
          Journeys by hour of day, weekdays against weekends
        </p>
        <p className="hidden max-w-[92%] text-sm leading-[1.55] text-foreground md:block">
          Here’s a bar chart of journeys for each hour, with weekdays and weekends side by side.
        </p>
        <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          <Icon name="check" size={12} strokeWidth={2.5} />
          Chart drawn · spec validated
        </p>
        <div className="hidden min-h-6 grow md:block" />
        <div className="hidden flex-wrap gap-1.5 md:flex">
          {["Make it stacked", "Only weekends", "Split by bike type"].map((chip) => (
            <span key={chip} className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] text-foreground">
              {chip}
            </span>
          ))}
        </div>
        <div className="hidden items-center gap-2 rounded-[14px] border border-border bg-card py-2 pr-2 pl-4 md:flex">
          <span className="grow text-sm text-muted">Describe a chart…</span>
          <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
            <Icon name="arrow-up" />
          </span>
        </div>
      </div>
    </div>
  );
}
