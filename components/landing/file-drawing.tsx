// Step 1: a file card with its columns.
export function FileDrawing() {
  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-raised max-w-[276px] p-3 md:max-w-[290px] md:p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft font-mono text-[10px] font-medium text-accent md:size-[34px]">
          CSV
        </span>
        <div>
          <p className="text-sm font-medium">sales_2026.csv</p>
          <p className="text-xs text-muted">Read in your browser</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-[5px] font-mono text-[11px] text-secondary md:mt-3">
        {["date", "shop", "revenue", "scoops"].map((column) => (
          <span key={column} className="rounded-md bg-surface-track px-[7px] py-[3px]">
            {column}
          </span>
        ))}
      </div>
    </div>
  );
}
