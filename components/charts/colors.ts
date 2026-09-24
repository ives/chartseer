// Series colours are CSS variables in app/globals.css, so dark mode needs no
// JavaScript. The schema allows at most 12 series, one per variable (D-024).
export const SERIES_COLORS = 12;

export function seriesColor(index: number): string {
  return `var(--chart-${(index % SERIES_COLORS) + 1})`;
}
