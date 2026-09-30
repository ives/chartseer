import type { CartesianData } from "@/lib/data/prepare";
import { position } from "./cartesian";
import type { Axis, Hover, Inner, Pointer } from "./chart-frame";
import { seriesColor } from "./colors";
import { cartesianTooltip, nearestIndex } from "./tooltip-content";

// Lines and areas snap to the nearest x value: a guide line down the plot, a
// dot where each series crosses it, and every series' value in the tooltip
// (D-052). `yOf` gives the pixel height of a series at an x index, or null
// where it has no value; stacked areas pass the top of each layer.
export function snapHover(
  data: CartesianData,
  x: Axis,
  pointer: Pointer,
  inner: Inner,
  yOf: (series: number, index: number) => number | null,
): Hover | null {
  const positions = data.x.values.map((value) => position(x, value) ?? Number.NaN);
  const index = nearestIndex(positions, pointer.x);
  const at = positions[index];
  if (index < 0 || at === undefined || !Number.isFinite(at)) return null;
  return {
    content: cartesianTooltip(data, index, seriesColor),
    marker: (
      <>
        <line x1={at} x2={at} y1={0} y2={inner.height} style={{ stroke: "var(--chart-muted)", strokeWidth: 1 }} />
        {data.series.map((_, i) => {
          const y = yOf(i, index);
          return y === null ? null : (
            <circle key={i} cx={at} cy={y} r={4} style={{ fill: seriesColor(i), stroke: "var(--chart-gap)", strokeWidth: 2 }} />
          );
        })}
      </>
    ),
  };
}
