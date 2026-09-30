import type { ReactNode } from "react";

type AppHeaderProps = {
  // Shown beside the wordmark, e.g. the dataset picker and upload button.
  controls?: ReactNode;
  // Shown under the top row, e.g. the privacy note and an upload error.
  children?: ReactNode;
};

// The wordmark and the page-level controls (D-054).
export function AppHeader({ controls, children }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-1 border-b border-border pb-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Chartseer
          <span aria-hidden="true" className="ml-0.5 inline-block size-[0.36em] rounded-[1px] bg-accent" />
        </h1>
        {controls}
      </div>
      {children}
    </header>
  );
}
