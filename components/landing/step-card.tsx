import type { ReactNode } from "react";

// One of the three "How it works" cards: a drawing in a well, then the text.
export function StepCard({ number, title, children, drawing }: { number: string; title: string; children: ReactNode; drawing: ReactNode }) {
  return (
    <li className="min-w-0 basis-[326px] grow rounded-[18px] border border-border-card bg-card px-2.5 pt-2.5 pb-[22px] md:rounded-[20px] md:px-3 md:pt-3 md:pb-7">
      <div
        aria-hidden="true"
        className="flex h-40 flex-col items-center justify-center gap-2.5 rounded-[11px] bg-surface p-5 md:h-[200px] md:rounded-xl md:p-6"
      >
        {drawing}
      </div>
      <div className="px-2.5 pt-5 md:px-4 md:pt-6">
        <p className="font-mono text-xs text-muted md:text-[13px]">{number}</p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] md:mt-2 md:text-[21px]">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-[1.55] text-secondary md:mt-2 md:text-base">{children}</p>
      </div>
    </li>
  );
}
