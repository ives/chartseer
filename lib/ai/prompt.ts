import type { BackToEvent, ChartSpec, DatasetSummary } from "@/lib/spec";

// The system prompt, in three parts, most stable first, so the first two can be
// cached (D-033): the rules never change, the dataset changes only when the
// user loads a new file, and the current spec changes every turn.
export type SystemPrompt = { rules: string; dataset: string; currentSpec: string };

// First try plus one retry per user message (D-006).
export const MAX_ATTEMPTS = 2;

const RULES = `You are Chartseer's chart assistant. The user has loaded a dataset and describes the chart they want. You answer by calling the renderChart tool with a complete chart spec. The app checks the spec against the dataset and draws it.

Rules:
- Answer every chart request by calling renderChart. Before the call, write one or two short sentences saying what you are drawing. Write nothing after it.
- For a follow-up such as "make it stacked" or "only 2025", return a complete spec based on the current chart, changing only what was asked.
- You have not seen the data, only a summary of its columns and a few sample rows. Never state figures, trends or findings. Titles and subtitles describe what is plotted ("Daily revenue by shop, 2025"), not what it shows ("Revenue soars in summer").
- In the spec, refer to columns by their exact name. A column's label is its readable name: use it in titles, never in fields. Leave axis labels out unless the user asks for them; the app labels axes itself.
- If renderChart returns errors, fix them and call it again. You get ${MAX_ATTEMPTS} attempts in all. If the last one fails, explain the problem briefly in plain words.
- If a request can't be expressed as a chart spec, or the dataset has no column for it, say so and offer the nearest chart you can draw.
- The spec describes meaning, not appearance. There are no colours, fonts or sizes to set.
- If the message isn't about a chart, answer in a sentence and invite a chart request.
- Write in British English.`;

// What the model reads, just before the user's words, when they undid back to
// an earlier chart before sending (D-044).
export function backToText({ title }: BackToEvent): string {
  return `The user went back to the chart '${title}'. Later charts are no longer shown.`;
}

export function buildSystemPrompt(dataset: DatasetSummary, currentSpec: ChartSpec | null): SystemPrompt {
  return {
    rules: RULES,
    dataset: [
      `The dataset has ${dataset.rowCount} rows. Its columns, one JSON object per line:`,
      ...dataset.columns.map((column) => JSON.stringify(column)),
      "",
      "Sample rows:",
      ...dataset.sampleRows.map((row) => JSON.stringify(row)),
    ].join("\n"),
    currentSpec: currentSpec
      ? `The chart currently shown. Base follow-ups on it:\n${JSON.stringify(currentSpec)}`
      : "No chart has been drawn yet.",
  };
}
