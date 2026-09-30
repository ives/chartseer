import { type Point, edgePaths } from "./cartesian";
import { lerp, useTween } from "./use-tween";

// One line, already in pixels: y is the drawn height, or null for a gap.
export type LineSeries = { key: string; color: string; points: Point[] };

// The lines of a line chart, easing point for point to their new heights when
// the data changes (D-053). Series that don't correspond simply jump; the
// chart crossfades in that case (motion.ts).
export function LineMarks({ series, trigger }: { series: LineSeries[]; trigger: unknown }) {
  const shown = useTween(series, trigger, (from, to, t) =>
    to.map((s, i) => {
      const old = from[i];
      if (!old || old.key !== s.key || old.points.length !== s.points.length) return s;
      return { ...s, points: s.points.map((p, j) => tweenPoint(old.points[j], p, t)) };
    }),
  );

  return shown.map((s) => {
    const stroke = { fill: "none", stroke: s.color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" } as const;
    // Partial buckets (D-026) are left out of the solid line and joined to
    // their neighbours by a dashed one.
    const { solid, dashed } = edgePaths(s.points, (y) => y);
    return (
      <g key={s.key}>
        <path d={solid || undefined} style={stroke} />
        {dashed && <path d={dashed} data-partial="" style={{ ...stroke, strokeDasharray: "var(--chart-partial-dash)" }} />}
        {/* A value between two gaps has no line segment, so it gets a dot. */}
        {s.points.map((p, j) =>
          p.y !== null && s.points[j - 1]?.y == null && s.points[j + 1]?.y == null ? (
            <circle key={j} cx={p.x} cy={p.y} r={2.5} style={{ fill: s.color }} />
          ) : null,
        )}
      </g>
    );
  });
}

// A point moves only if it had a height before; one leaving or entering a gap jumps.
export function tweenPoint<P extends Point>(old: P | undefined, next: P, t: number): P {
  if (!old || old.y === null || next.y === null) return next;
  return { ...next, x: lerp(old.x, next.x, t), y: lerp(old.y, next.y, t) };
}
