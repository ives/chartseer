"use client";

import { useState } from "react";
import type { ChartProps } from "@/components/charts/chart-view";
import { type DownloadFormat, chartBlob, downloadBlob, downloadName } from "@/components/charts/download";

const FORMATS: DownloadFormat[] = ["svg", "png"];

// Downloads the current chart, light-themed at 1200×675 (D-059).
export function DownloadButtons({ chart, className }: { chart: ChartProps; className: string }) {
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

  return (
    <>
      {FORMATS.map((format) => (
        <button
          key={format}
          type="button"
          disabled={making !== null}
          aria-busy={making === format}
          onClick={() => void download(format)}
          className={className}
        >
          Download {format.toUpperCase()}
        </button>
      ))}
      {failed && (
        <p role="alert" className="basis-full text-right text-danger">
          Couldn’t create the download.
        </p>
      )}
    </>
  );
}
