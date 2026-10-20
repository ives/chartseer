import { journeysByHour } from "./illustration-data";

const LEFT = 12;
const RIGHT = 508;
const BASELINE = 188;
const PEAK = 22;

// The bikes demo card: journeys by hour as two lines, with the weekday
// morning and evening peaks ringed.
export function HourlyLines() {
  const max = Math.max(...journeysByHour.weekday, ...journeysByHour.weekend);
  const x = (hour: number) => Math.round(LEFT + (hour / 23) * (RIGHT - LEFT));
  const y = (value: number) => Math.round(BASELINE - (value / max) * (BASELINE - PEAK));
  const path = (values: number[]) => values.map((v, hour) => `${hour === 0 ? "M" : "L"}${x(hour)},${y(v)}`).join(" ");
  const peakIn = (from: number, to: number) => {
    const hours = journeysByHour.weekday.slice(from, to);
    return from + hours.indexOf(Math.max(...hours));
  };
  const peaks = [peakIn(0, 12), peakIn(12, 24)];
  return (
    <svg
      role="img"
      aria-label="Line chart: weekday journeys peak at 8am and 5pm; weekend journeys rise gently to a midday plateau"
      viewBox="0 0 520 200"
      className="block h-auto w-full fill-none [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <line x1={LEFT} x2={RIGHT} y1={BASELINE} y2={BASELINE} className="stroke-border" />
      <path d={path(journeysByHour.weekday)} className="stroke-[var(--chart-1)] stroke-4 md:stroke-3" />
      <path d={path(journeysByHour.weekend)} className="stroke-[var(--chart-2)] stroke-4 md:stroke-3" />
      {peaks.map((hour) => (
        <circle
          key={hour}
          cx={x(hour)}
          cy={y(journeysByHour.weekday[hour] ?? 0)}
          r="5"
          className="hidden fill-card stroke-[var(--chart-1)] stroke-[2.5] md:block"
        />
      ))}
    </svg>
  );
}
