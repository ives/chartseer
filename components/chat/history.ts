// Undo and redo over the chart history (D-044). The history itself stays
// derived from the messages (chartHistory); this keeps the steps through it,
// as positions in that list.

export type ChartSteps = {
  // Positions in the chart history that undo and redo move through, oldest first.
  stack: number[];
  // Where the shown chart is in `stack`; -1 before the first chart.
  position: number;
  // How many charts of the history have been folded in.
  seen: number;
  // True after an undo or redo, so it can be announced; a new chart is announced by the chat.
  announce: boolean;
};

export const initialSteps: ChartSteps = { stack: [], position: -1, seen: 0, announce: false };

// Folds in charts that have arrived since the last call. A new chart after an
// undo drops the redo steps, as in any editor. If the history shrank (a retry
// replaced a message that had drawn a chart), the lost charts go too.
// Pure and idempotent, so it can run on every render.
export function syncSteps(steps: ChartSteps, length: number): ChartSteps {
  if (length === steps.seen) return steps;
  if (length < steps.seen) {
    const kept = steps.stack.filter((i) => i < length);
    const shown = steps.stack[steps.position];
    const position = shown !== undefined && shown < length ? kept.indexOf(shown) : kept.length - 1;
    return { stack: kept, position, seen: length, announce: false };
  }
  let { stack, position } = steps;
  for (let i = steps.seen; i < length; i++) {
    stack = [...stack.slice(0, position + 1), i];
    position = stack.length - 1;
  }
  return { stack, position, seen: length, announce: false };
}

export function canUndo(steps: ChartSteps): boolean {
  return steps.position > 0;
}

export function canRedo(steps: ChartSteps): boolean {
  return steps.position < steps.stack.length - 1;
}

export function undo(steps: ChartSteps): ChartSteps {
  return canUndo(steps) ? { ...steps, position: steps.position - 1, announce: true } : steps;
}

export function redo(steps: ChartSteps): ChartSteps {
  return canRedo(steps) ? { ...steps, position: steps.position + 1, announce: true } : steps;
}

// The shown chart's index in the chart history, if there is one.
export function currentIndex(steps: ChartSteps): number | undefined {
  return steps.stack[steps.position];
}

// "Showing chart 2 of 4".
export function stepLabel(steps: ChartSteps): string {
  return `Showing chart ${steps.position + 1} of ${steps.stack.length}`;
}
