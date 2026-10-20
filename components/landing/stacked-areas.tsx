import { weeklyScoops } from "./illustration-data";

const LEFT = 8;
const RIGHT = 512;
const BASELINE = 192;
const TOP = 16;
const fills = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

// Pairs of weeks, so the drawing reads as seasons rather than weekly noise.
function fortnights(weeks: number[]): number[] {
  return Array.from({ length: Math.floor(weeks.length / 2) }, (_, i) => (weeks[2 * i] ?? 0) + (weeks[2 * i + 1] ?? 0));
}

// The gelato demo card: scoops stacked by shop, a point per fortnight.
export function StackedAreas() {
  const series = Object.values(weeklyScoops).map(fortnights);
  const weeks = series[0]?.length ?? 0;
  // Running totals: tops[i][w] is the top edge of shop i at fortnight w.
  const tops = series.map((_, i) => Array.from({ length: weeks }, (_, w) => series.slice(0, i + 1).reduce((sum, s) => sum + (s[w] ?? 0), 0)));
  const max = Math.max(...(tops.at(-1) ?? [1]));
  const x = (week: number) => Math.round(LEFT + (week / (weeks - 1)) * (RIGHT - LEFT));
  const y = (value: number) => Math.round(BASELINE - (value / max) * (BASELINE - TOP));
  const edge = (values: number[]) => values.map((v, w) => [x(w), y(v)] as const);
  return (
    <svg
      role="img"
      aria-label="Stacked area chart: gelato sales across five shops over two years, peaking every summer"
      viewBox="0 0 520 200"
      className="block h-auto w-full"
    >
      {/* Each layer runs from the baseline to its running total, drawn back to
          front, so a path needs only its top edge: half the HTML. */}
      {tops
        .map((top, i) => {
          const d = `M${LEFT},${BASELINE} ${edge(top).map(([px, py]) => `L${px},${py}`).join(" ")} L${RIGHT},${BASELINE} Z`;
          return <path key={i} d={d} style={{ fill: fills[i] }} className="stroke-surface stroke-[1.5] [stroke-linejoin:round] md:stroke-[1.2]" />;
        })
        .reverse()}
    </svg>
  );
}
