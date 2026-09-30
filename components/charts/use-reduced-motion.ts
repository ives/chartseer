"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// True when the reader has asked for less motion; nothing then moves (D-053).
// On the server, and wherever matchMedia is missing, it assumes they have.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? true, () => true);
}

function query(): MediaQueryList | undefined {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : undefined;
}

function subscribe(onChange: () => void): () => void {
  const list = query();
  list?.addEventListener("change", onChange);
  return () => list?.removeEventListener("change", onChange);
}
