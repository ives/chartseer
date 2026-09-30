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
      <div className="flex items-center justify-between gap-2 text-xs">
        <span id={labelId} className="text-(--chart-muted)">
          Chart spec (JSON)
        </span>
        <span className="flex items-center gap-2">
          <span role="status" className="text-(--chart-muted)">
            {status}
          </span>
          <button type="button" onClick={() => void copy()} className="rounded border border-(--chart-axis) px-2 py-0.5">
            Copy
          </button>
        </span>
      </div>
      {/* Focusable, so a keyboard can scroll a long spec. */}
      <pre
        role="region"
        aria-labelledby={labelId}
        tabIndex={0}
        className="max-h-96 overflow-auto rounded border border-(--chart-grid) bg-surface p-3 font-mono text-xs leading-relaxed"
      >
        <code>{json}</code>
      </pre>
    </div>
  );
}
