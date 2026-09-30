import { area } from "d3-shape";
import { type Point, edgePaths } from "./cartesian";
import { tweenPoint } from "./line-marks";
import { lerp, useTween } from "./use-tween";

// A point on an area's top edge, with the bottom edge beneath it, in pixels.
export type FillPoint = Point & { lower: number };
export type AreaLayer = { key: string; color: string; points: FillPoint[] };

// The layers of an area chart, easing point for point like lines (D-053).
export function AreaMarks({ layers, stacked, trigger }: { layers: AreaLayer[]; stacked: boolean; trigger: unknown }) {
  const shown = useTween(layers, trigger, (from, to, t) =>
    to.map((layer, i) => {
      const old = from[i];
      if (!old || old.key !== layer.key || old.points.length !== layer.points.length) return layer;
      return {
        ...layer,
        points: layer.points.map((p, j) => {
          const before = old.points[j];
          const moved = tweenPoint(before, p, t);
          return { ...moved, lower: before ? lerp(before.lower, p.lower, t) : p.lower };
        }),
      };
    }),
  );

  const fill = (points: FillPoint[], defined: (p: FillPoint) => boolean) =>
    area<FillPoint>()
      .defined(defined)
      .x((p) => p.x)
      .y0((p) => p.lower)
      .y1((p) => p.y ?? p.lower)(points) ?? undefined;
  const present = (p: FillPoint) => p.y !== null;

  return shown.map(({ key, color, points }) => {
    if (stacked) {
      // Partial buckets (D-026) are filled lighter beneath the full-strength
      // fill, which leaves them out. A line in the gap colour separates the layers.
      const edge = edgePaths(points, (y) => y);
      const partial = points.some((p) => p.partial);
      return (
        <g key={key}>
          {partial && <path d={fill(points, present)} data-partial="" style={{ fill: color, opacity: "var(--chart-partial-opacity)" }} />}
          <path d={fill(points, (p) => present(p) && !p.partial)} style={{ fill: color }} />
          <path d={`${edge.solid}${edge.dashed}` || undefined} style={{ fill: "none", stroke: "var(--chart-gap)", strokeWidth: 2 }} />
        </g>
      );
    }
    const { solid, dashed } = edgePaths(points, (y) => y);
    const stroke = { fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" } as const;
    return (
      <g key={key}>
        <path d={fill(points, present)} style={{ fill: color, opacity: "var(--chart-area-opacity)" }} />
        <path d={solid || undefined} style={stroke} />
        {dashed && <path d={dashed} data-partial="" style={{ ...stroke, strokeDasharray: "var(--chart-partial-dash)" }} />}
        {/* A value between two gaps has no area, so it gets a dot. */}
        {points.map((p, j) =>
          p.y !== null && points[j - 1]?.y == null && points[j + 1]?.y == null ? (
            <circle key={j} cx={p.x} cy={p.y} r={2.5} style={{ fill: color }} />
          ) : null,
        )}
      </g>
    );
  });
}
