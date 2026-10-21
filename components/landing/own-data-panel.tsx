import type { ReactNode } from "react";
import { Icon } from "./icon";

// The "Got your own data?" strip. The button differs: the landing page hands
// the file over (UploadCsvButton), the app reads it itself.
export function OwnDataPanel({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[18px] border-[1.5px] border-dashed border-border-strong bg-card px-5 py-[22px] md:flex-row md:flex-wrap md:items-center md:gap-5 md:rounded-[20px] md:px-7 md:py-6">
      <div className="flex min-w-0 grow items-center md:basis-[348px] gap-3.5 md:gap-5">
        <span className="inline-flex size-11 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent md:size-12">
          <Icon name="upload" size={22} />
        </span>
        <div>
          <p className="text-[17px] font-semibold tracking-[-0.015em] md:text-lg">Got your own data?</p>
          <p className="mt-0.5 text-sm text-secondary md:text-[15px]">
            <span className="md:hidden">Any CSV up to 5 MB. UK and US dates and currencies just work.</span>
            <span className="hidden md:inline">
              Drop a CSV anywhere on the page, up to 5 MB. UK and US dates and currencies just work.
            </span>
          </p>
        </div>
      </div>
      {children}
      {note && <p className="basis-full text-xs text-muted">{note}</p>}
    </div>
  );
}
