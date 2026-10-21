"use client";

import { useId, useState } from "react";
import type { ChartSpec } from "@/lib/spec";

// The chart's spec as read-only JSON: the "view spec" side of every chart (D-058).
export function ChartSpecView({ spec }: { spec: ChartSpec }) {
  const labelId = useId();
  const [status, setStatus] = useState("");
  const json = JSON.stringify(spec, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setStatus("Copied");
    } catch {
      setStatus("Couldn’t copy. Select the text instead.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs md:text-[13px]">
        <span id={labelId} className="text-muted">
          Chart spec (JSON)
        </span>
        <span className="flex items-center gap-2">
          <span role="status" className="text-muted">
            {status}
          </span>
          <button type="button" onClick={() => void copy()} className="min-h-11 rounded-[10px] border border-border bg-card px-3 font-medium hover:border-border-strong md:min-h-9">
            Copy
          </button>
        </span>
      </div>
      {/* Focusable, so a keyboard can scroll a long spec. */}
      <pre
        role="region"
        aria-labelledby={labelId}
        tabIndex={0}
        className="max-h-[28rem] overflow-auto rounded-xl border border-border-card bg-surface p-4 font-mono text-xs leading-relaxed"
      >
        <code>{json}</code>
      </pre>
    </div>
  );
}
