"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { type ChartProps, ChartView } from "./chart-view";
import { transitionKind } from "./motion";
import { useReducedMotion } from "./use-reduced-motion";

const CROSSFADE_MS = 200;

// A chart, and how it changes when a refinement replaces it (D-053). When the
// marks correspond, the renderer eases them itself. Otherwise the old chart
// stays on top for a moment and fades out while the new one fades in. With
// reduced motion the new chart simply replaces the old.
export function Chart(props: ChartProps) {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<{ id: number; props: ChartProps } | null>(null);
  const previous = useRef<ChartProps>(props);
  const count = useRef(0);

  // Before paint, so the old chart never disappears for a frame.
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = props;
    if (before.spec === props.spec && before.data === props.data) return;
    if (reduced || transitionKind(before, props) !== "crossfade") return;
    const id = ++count.current;
    setLeaving({ id, props: before });
    const timer = setTimeout(() => setLeaving((current) => (current?.id === id ? null : current)), CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [props, reduced]);

  return (
    <div className="relative">
      {/* Not keyed: remounting would re-measure the width and flicker. */}
      <div className={leaving ? "animate-[chart-fade-in_200ms_ease-out]" : undefined}>
        <ChartView {...props} />
      </div>
      {leaving && (
        // Out of the way of everything: not focusable, not read out, not clickable.
        <div
          inert
          aria-hidden="true"
          data-chart-leaving=""
          className="pointer-events-none absolute inset-x-0 top-0 animate-[chart-fade-out_200ms_ease-out_forwards]"
        >
          <ChartView {...leaving.props} />
        </div>
      )}
    </div>
  );
}
