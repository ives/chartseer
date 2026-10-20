import { journeysByHour } from "./illustration-data";

const r1 = (n: number) => Math.round(n * 10) / 10;

// Behind the closing call to action: two days of weekday journeys as faint bars.
export function CtaBars({ className }: { className?: string }) {
  const values = [...journeysByHour.weekday, ...journeysByHour.weekday];
  const max = Math.max(...values);
  const step = 1000 / values.length;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 120"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 bottom-0 w-full fill-accent-on-dark/16 ${className ?? ""}`}
    >
      {/* One path, not a rect per bar, keeps the page's HTML small. A floor of 9
          keeps the quiet night hours visible as bars. */}
      <path d={values.map((value, i) => `M${r1(i * step + 3)} 120V${r1(111 - (value / max) * 103)}h${r1(step - 6)}V120z`).join("")} />
    </svg>
  );
}
