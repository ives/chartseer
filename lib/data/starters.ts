import type { ColumnSummary, DatasetSummary } from "@/lib/spec";
import { inlineLabel } from "./labels";

// Starter prompts for an uploaded file, built from its column summary without
// calling the model (D-045): up to four requests a chart can answer.

const MAX_STARTERS = 4;
const MAX_SERIES = 12; // As many series as a chart allows.
const MAX_BARS = 50; // As many bars as a chart shows without a limit.

export function starterPrompts(summary: DatasetSummary): string[] {
  const { columns } = summary;
  const date = columns.find((c) => c.kind === "date");
  const [number, other] = columns.filter((c) => c.kind === "number");
  const series = categoryWithin(columns, MAX_SERIES);
  const bars = categoryWithin(columns, MAX_BARS);

  const prompts: string[] = [];
  if (date) prompts.push(number ? `Total ${phrase(number)} by month` : "Number of rows by month");
  if (date && number && series) prompts.push(`${capital(phrase(number))} over time, one line per ${phrase(series)}`);
  if (bars) prompts.push(number ? `Total ${phrase(number)} by ${phrase(bars)}` : `Number of rows by ${phrase(bars)}`);
  if (number && other) prompts.push(`${capital(phrase(other))} against ${phrase(number)}`);
  return prompts.slice(0, MAX_STARTERS);
}

function categoryWithin(columns: ColumnSummary[], max: number): ColumnSummary | undefined {
  return columns.find((c) => c.kind === "category" && c.distinct >= 2 && c.distinct <= max);
}

function phrase(column: ColumnSummary): string {
  return inlineLabel(column.label ?? column.name);
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
