import { Icon } from "./icon";

// Step 2: a request being typed, with follow-up chips.
export function AskDrawing() {
  return (
    <>
      <div className="flex w-full max-w-[281px] items-center gap-2 rounded-[13px] border border-border bg-card py-[7px] pr-[7px] pl-3 shadow-raised md:max-w-[294px] md:rounded-[14px] md:py-2 md:pr-2 md:pl-3.5">
        <span className="grow text-sm text-foreground">
          Revenue by shop, stacked
          <span className="ml-0.5 inline-block h-[15px] w-[1.5px] bg-accent align-[-3px] md:h-4" />
        </span>
        <span className="inline-flex size-[30px] items-center justify-center rounded-lg bg-accent text-accent-foreground md:size-8 md:rounded-[9px]">
          <Icon name="arrow-up" size={13} />
        </span>
      </div>
      <div className="flex gap-1.5 text-xs text-secondary">
        {["Only Brixton", "By month"].map((chip) => (
          <span key={chip} className="rounded-full border border-border bg-card px-2.5 py-1">
            {chip}
          </span>
        ))}
      </div>
    </>
  );
}
