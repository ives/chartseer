"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

// Under 300 ms, easing out, so a refinement feels connected to the chart
// before it without slowing the reader down (D-053).
export const TWEEN_MS = 250;

// Eases from what was last drawn to `target` whenever `trigger` changes (a new
// spec or data), and jumps straight there when only `target` changes (a
// resize). With reduced motion it always jumps. `interpolate` blends two
// values at t in [0, 1]; it decides what can move and what just appears.
export function useTween<T>(target: T, trigger: unknown, interpolate: (from: T, to: T, t: number) => T): T {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState<{ from: T; t: number } | null>(null);
  const shown = useRef(target);
  const lastTrigger = useRef(trigger);

  // A layout effect, so the first frame of a transition replaces the new
  // target before the browser paints it.
  useLayoutEffect(() => {
    if (trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    if (reduced) return;
    const from = shown.current;
    const start = performance.now();
    let id = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / TWEEN_MS);
      if (progress >= 1) return setFrame(null);
      setFrame({ from, t: easeOutCubic(progress) });
      id = requestAnimationFrame(step);
    };
    setFrame({ from, t: 0 });
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [trigger, reduced]);

  const value = frame && !reduced ? interpolate(frame.from, target, frame.t) : target;
  useLayoutEffect(() => {
    shown.current = value;
  });
  return value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
