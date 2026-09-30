// Display names for columns: axis and legend titles (D-025).
export type LabelMeta = {
  // Column name → readable label, e.g. max_temp_c → "Peak temperature (°C)".
  columnLabels?: Record<string, string>;
  // What one row is, used to title counts, e.g. "Journeys".
  rowLabel?: string;
};

export function columnLabel(name: string, meta: LabelMeta): string {
  return meta.columnLabels?.[name] ?? deriveLabel(name);
}

// A label as it reads mid-sentence: "Takings (£)" → "takings", "Start
// station" → "start station", but "GDP per capita" keeps its capitals.
export function inlineLabel(label: string): string {
  const bare = label.replace(/\s*\([^)]*\)$/, "");
  const [first = "", second = ""] = bare;
  return /[A-Z]/.test(second) ? bare : first.toLowerCase() + bare.slice(1);
}

// For columns with no label, such as an uploaded file's: underscores become
// spaces and the first letter is capitalised. The rest is left alone, so
// acronyms survive: GDP_per_capita → "GDP per capita".
export function deriveLabel(name: string): string {
  const spaced = name.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (spaced === "") return name;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
