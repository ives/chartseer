import Link, { type LinkProps } from "next/link";
import type { ReactNode, Ref } from "react";

type AppHeaderProps = {
  // Shown beside the wordmark, e.g. the dataset picker and upload button.
  controls?: ReactNode;
  // Shown under the top row, e.g. the privacy note and an upload error.
  children?: ReactNode;
  // Called before the wordmark navigates home; it can cancel the navigation (D-067).
  onHomeNavigate?: LinkProps["onNavigate"];
  homeRef?: Ref<HTMLAnchorElement>;
};

// The wordmark and the page-level controls (D-054). The wordmark links to the landing page.
export function AppHeader({ controls, children, onHomeNavigate, homeRef }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-1 border-b border-border pb-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          <Link href="/" ref={homeRef} onNavigate={onHomeNavigate}>
            Chartseer
            <span aria-hidden="true" className="ml-0.5 inline-block size-[0.36em] rounded-[1px] bg-accent" />
          </Link>
        </h1>
        {controls}
      </div>
      {children}
    </header>
  );
}
