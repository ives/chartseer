import type { BarRect } from "./bar-chart";
import { seriesColor } from "./colors";
import { lerp, useTween } from "./use-tween";

// A bar that has just appeared fades in rather than moving from nowhere.
type Shown = BarRect & { appear: number };

// The bars, easing to their new size and place when the data changes (D-053).
// Each is keyed by category and series, so a bar that stays moves, and a new
// one fades in.
export function BarMarks({ rects, trigger }: { rects: BarRect[]; trigger: unknown }) {
  const shown = useTween<Shown[]>(
    rects.map((r) => ({ ...r, appear: 1 })),
    trigger,
    (from, to, t) => {
      const before = new Map(from.map((r) => [r.key, r]));
      return to.map((r) => {
        const old = before.get(r.key);
        if (!old) return { ...r, appear: t };
        return { ...r, x: lerp(old.x, r.x, t), y: lerp(old.y, r.y, t), width: lerp(old.width, r.width, t), height: lerp(old.height, r.height, t) };
      });
    },
  );
  return shown.map((r) => (
    <rect
      key={r.key}
      x={r.x}
      y={r.y}
      width={r.width}
      height={r.height}
      data-partial={r.partial ? "" : undefined}
      // Partial buckets (D-026) are drawn lighter.
      style={{
        fill: seriesColor(r.series),
        opacity: r.partial ? `calc(var(--chart-partial-opacity) * ${r.appear})` : r.appear,
      }}
    />
  ));
}
