import Link, { type LinkProps } from "next/link";
import type { ReactNode, Ref } from "react";

type AppHeaderProps = {
  // Beside the wordmark: the dataset switcher. Its own row on a phone.
  controls?: ReactNode;
  // At the right, before the actions: the privacy note. Under the controls on a phone.
  note?: ReactNode;
  // At the far right, beside the wordmark on a phone: the upload button.
  actions?: ReactNode;
  // Under everything, e.g. an upload error.
  children?: ReactNode;
  // Called before the wordmark navigates home; it can cancel the navigation (D-067).
  onHomeNavigate?: LinkProps["onNavigate"];
  homeRef?: Ref<HTMLAnchorElement>;
};

// The wordmark and the page-level controls (D-054). The wordmark links to the landing page.
export function AppHeader({ controls, note, actions, children, onHomeNavigate, homeRef }: AppHeaderProps) {
  return (
    <header className="flex flex-none flex-col gap-2 border-b border-border-card px-3 pt-2 pb-3 md:px-6 md:py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:flex-nowrap">
        <h1 className="mr-auto font-serif text-[22px] font-semibold tracking-[-0.01em] md:mr-0 md:text-[23px]">
          <Link href="/" ref={homeRef} onNavigate={onHomeNavigate} className="inline-flex items-baseline gap-[3px] px-1 py-2 md:p-0">
            Chartseer
            <span aria-hidden="true" className="inline-block size-1.5 bg-accent" />
          </Link>
        </h1>
        {controls && (
          <>
            <span aria-hidden="true" className="h-6 w-px flex-none bg-border max-md:hidden" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 max-md:order-3 max-md:basis-full">{controls}</div>
          </>
        )}
        {note && <div className="max-md:order-4 max-md:-mt-1 max-md:basis-full md:ml-auto">{note}</div>}
        {actions && <div className="flex flex-none items-center gap-3 max-md:order-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
