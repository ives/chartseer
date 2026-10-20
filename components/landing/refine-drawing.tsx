// Step 3: a small chart with undo, redo and download.
export function RefineDrawing() {
  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-raised max-w-[284px] p-[11px] md:max-w-[296px] md:p-3">
      <svg viewBox="0 0 240 72" className="block h-auto w-full fill-none stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 58 L34 50 L64 54 L94 36 L124 40 L154 22 L184 28 L214 12 L236 16" className="stroke-[var(--chart-1)]" />
        <path d="M4 64 L34 62 L64 60 L94 56 L124 58 L154 48 L184 50 L214 42 L236 44" className="stroke-[var(--chart-2)]" />
      </svg>
      <div className="mt-2 flex gap-[5px] text-[11px] md:mt-2.5">
        <span className="rounded-[7px] border border-border px-2 py-1 text-foreground">↶ Undo</span>
        <span className="rounded-[7px] border border-border px-2 py-1 text-muted">↷ Redo</span>
        <span className="ml-auto rounded-[7px] bg-ink px-2 py-1 text-on-ink">PNG ↓</span>
      </div>
    </div>
  );
}
