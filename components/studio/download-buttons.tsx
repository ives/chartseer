"use client";

import { useState } from "react";
import type { ChartProps } from "@/components/charts/chart-view";
import { type DownloadFormat, chartBlob, downloadBlob, downloadName } from "@/components/charts/download";
import { Icon } from "@/components/landing/icon";

const FORMATS: DownloadFormat[] = ["svg", "png"];

// Downloads the current chart, light-themed at 1200×675 (D-059). On a desktop
// a joined pair in the toolbar; on a phone two half-width buttons under the chart.
export function DownloadButtons({ chart, layout }: { chart: ChartProps; layout: "joined" | "split" }) {
  const [making, setMaking] = useState<DownloadFormat | null>(null);
  const [failed, setFailed] = useState(false);

  async function download(format: DownloadFormat) {
    setMaking(format);
    setFailed(false);
    try {
      downloadBlob(await chartBlob(chart, format), downloadName(chart.spec.title, format));
    } catch {
      setFailed(true);
    } finally {
      setMaking(null);
    }
  }

  const joined = layout === "joined";
  return (
    <>
      <div
        role="group"
        aria-label="Download"
        className={
          joined
            ? "inline-flex overflow-hidden rounded-[10px] border border-border"
            : "grid grid-cols-2 gap-2"
        }
      >
        {FORMATS.map((format, i) => (
          <button
            key={format}
            type="button"
            disabled={making !== null}
            aria-busy={making === format}
            // The visible text is the format; the group says what it does.
            aria-label={`Download ${format.toUpperCase()}`}
            onClick={() => void download(format)}
            className={`inline-flex items-center justify-center gap-1.5 bg-card text-[13px] font-medium disabled:opacity-40 ${
              joined
                ? `min-h-10 px-3 hover:bg-page ${i === 0 ? "border-r border-border" : ""}`
                : "min-h-11 rounded-[11px] border border-border"
            }`}
          >
            {(!joined || i === 0) && <Icon name="download" size={15} />}
            {format.toUpperCase()}
          </button>
        ))}
      </div>
      {failed && (
        <p role="alert" className="basis-full text-right text-sm text-danger">
          Couldn’t create the download.
        </p>
      )}
    </>
  );
}
