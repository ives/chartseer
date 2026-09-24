"use client";

import { useEffect, useState } from "react";
import { Chart } from "@/components/charts/chart";
import { type DatasetMeta, datasets } from "@/lib/data/datasets";
import { type InferredDataset, inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { prepareChartData } from "@/lib/data/prepare";
import { type DatasetSummary, bikesSummary, examples, gelatoSummary, parseSpec } from "@/lib/spec";

type Loaded = Map<DatasetMeta, InferredDataset>;

// Examples carry the hand-written fixture summary they were written against.
const metaFor = new Map<DatasetSummary, DatasetMeta>([
  [bikesSummary, datasets.bikes],
  [gelatoSummary, datasets.gelato],
]);

export function Gallery() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const metas = Object.values(datasets);
    Promise.all(
      metas.map(async (meta) => {
        const response = await fetch(meta.path);
        if (!response.ok) throw new Error(`${meta.path}: ${response.status}`);
        return [meta, inferDataset(parseCsv(await response.text()), meta)] as const;
      }),
    ).then(
      (entries) => setLoaded(new Map(entries)),
      (e: unknown) => setError(String(e)),
    );
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-10">
      <h1 className="text-2xl font-semibold">Chart gallery</h1>
      {error && <p role="alert">Couldn’t load the demo data: {error}</p>}
      {!loaded && !error && <p>Loading the demo data…</p>}
      {loaded &&
        examples.map((example) => {
          const meta = metaFor.get(example.dataset);
          const inferred = meta && loaded.get(meta);
          if (!meta || !inferred) return <p key={example.id}>{example.id}: no dataset</p>;
          const result = parseSpec(example.spec, inferred.summary);
          return (
            <section key={example.id} className="flex flex-col gap-3">
              <p className="font-mono text-xs opacity-60">{example.id}</p>
              {result.ok ? (
                <Chart spec={result.spec} data={prepareChartData(inferred.rows, inferred.summary, result.spec, meta)} dataset={meta} />
              ) : (
                <ul className="list-disc pl-5 text-sm text-red-600">
                  {result.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer opacity-70">Spec</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-xs dark:bg-white/10">
                  {JSON.stringify(example.spec, null, 2)}
                </pre>
              </details>
            </section>
          );
        })}
    </main>
  );
}
