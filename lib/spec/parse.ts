import type { DatasetSummary } from "./columns";
import { ChartSpec } from "./schema";
import { validateSpec } from "./validate";

export type ParseResult = { ok: true; spec: ChartSpec } | { ok: false; errors: string[] };

// The single entry point for a spec from the model: structure first (Zod),
// then meaning (validateSpec). Semantic checks only run on a well-formed spec.
// Every error reads "path: message", e.g. "filters[0].value: …".
export function parseSpec(input: unknown, dataset: DatasetSummary): ParseResult {
  const parsed = ChartSpec.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`) };
  }
  const errors = validateSpec(parsed.data, dataset);
  return errors.length === 0 ? { ok: true, spec: parsed.data } : { ok: false, errors };
}

function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "(root)";
  return path
    .map((key, i) => (typeof key === "number" ? `[${key}]` : `${i === 0 ? "" : "."}${String(key)}`))
    .join("");
}
