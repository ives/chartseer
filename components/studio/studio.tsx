"use client";

import { useState } from "react";
import { datasets } from "@/lib/data/datasets";
import { type DatasetId, DatasetPicker } from "./dataset-picker";
import { Workspace } from "./workspace";

// Suggestions for the empty chart area.
const EXAMPLES: Record<DatasetId, readonly string[]> = {
  bikes: ["Journeys by hour of day, weekdays against weekends", "The 10 busiest start areas"],
  gelato: ["Daily revenue by shop in 2025", "Scoops against peak temperature"],
};

export function Studio() {
  const [datasetId, setDatasetId] = useState<DatasetId>("gelato");
  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:h-dvh lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Chartseer</h1>
        <DatasetPicker value={datasetId} onChange={setDatasetId} />
      </header>
      {/* Remounting on a new dataset clears the data, the chat and the chart history together. */}
      <Workspace key={datasetId} meta={datasets[datasetId]} examples={EXAMPLES[datasetId]} />
    </main>
  );
}
