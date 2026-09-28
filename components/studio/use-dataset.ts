"use client";

import { useEffect, useState } from "react";
import type { DatasetMeta } from "@/lib/data/datasets";
import { type InferredDataset, inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";

export type DatasetState =
  | { status: "loading" }
  | { status: "ready"; dataset: InferredDataset }
  | { status: "error"; message: string };

// Fetches a bundled CSV and infers its summary in the browser (D-005).
// The caller remounts on a dataset change, so this loads once per mount.
export function useDataset(meta: DatasetMeta): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(meta.path)
      .then(async (response) => {
        if (!response.ok) throw new Error(`${meta.path}: ${response.status}`);
        return inferDataset(parseCsv(await response.text()), meta);
      })
      .then(
        (dataset) => !cancelled && setState({ status: "ready", dataset }),
        (error: unknown) => !cancelled && setState({ status: "error", message: String(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [meta]);

  return state;
}
