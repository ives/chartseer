import type { ParsedCsv } from "@/lib/data/parse";

// A file read on the landing page, waiting for Studio to open it (D-067).
// It lives in memory only: a refresh or a new tab finds it empty.
export type Handoff = { name: string; csv: ParsedCsv };

let pending: Handoff | null = null;

export function handOff(file: Handoff): void {
  pending = file;
}

// Peeking is pure, so a component can read it while rendering; it clears once mounted.
export function peekHandoff(): Handoff | null {
  return pending;
}

export function clearHandoff(): void {
  pending = null;
}
