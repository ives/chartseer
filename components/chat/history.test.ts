import { describe, expect, it } from "vitest";
import { type ChartSteps, canRedo, canUndo, currentIndex, initialSteps, redo, stepLabel, syncSteps, undo } from "./history";

// Charts arriving one at a time, as each reply draws one.
function drawn(count: number, from: ChartSteps = initialSteps): ChartSteps {
  let steps = from;
  for (let i = 0; i < count; i++) steps = syncSteps(steps, steps.seen + 1);
  return steps;
}

describe("chart steps", () => {
  it("starts with nothing to show", () => {
    expect(currentIndex(initialSteps)).toBeUndefined();
    expect([canUndo(initialSteps), canRedo(initialSteps)]).toEqual([false, false]);
  });

  it("shows each new chart", () => {
    const steps = drawn(3);
    expect(currentIndex(steps)).toBe(2);
    expect(stepLabel(steps)).toBe("Showing chart 3 of 3");
    expect([canUndo(steps), canRedo(steps)]).toEqual([true, false]);
  });

  it("undoes and redoes within bounds", () => {
    const first = undo(undo(undo(drawn(3))));
    expect(currentIndex(first)).toBe(0);
    expect(canUndo(first)).toBe(false);
    expect(undo(first)).toBe(first);

    const last = redo(redo(redo(first)));
    expect(currentIndex(last)).toBe(2);
    expect(redo(last)).toBe(last);
  });

  it("drops the redo steps when a new chart follows an undo", () => {
    const steps = drawn(1, undo(undo(drawn(4))));
    // Charts 0 and 1 stay; 2 and 3 are gone; the new chart is history index 4.
    expect(steps.stack).toEqual([0, 1, 4]);
    expect(stepLabel(steps)).toBe("Showing chart 3 of 3");
    expect(canRedo(steps)).toBe(false);
    expect(currentIndex(undo(steps))).toBe(1);
  });

  it("folds in several charts at once", () => {
    const steps = syncSteps(undo(drawn(2)), 4);
    expect(steps.stack).toEqual([0, 2, 3]);
    expect(currentIndex(steps)).toBe(3);
  });

  it("is idempotent, so it can run on every render", () => {
    const steps = undo(drawn(3));
    expect(syncSteps(steps, 3)).toBe(steps);
  });

  it("drops charts a retry removed, keeping the shown one if it survived", () => {
    const kept = syncSteps(undo(drawn(3)), 2);
    expect(kept.stack).toEqual([0, 1]);
    expect(currentIndex(kept)).toBe(1);

    const lost = syncSteps(drawn(3), 2);
    expect(currentIndex(lost)).toBe(1);
    expect(canRedo(lost)).toBe(false);
  });

  it("announces only undo and redo", () => {
    expect(drawn(2).announce).toBe(false);
    expect(undo(drawn(2)).announce).toBe(true);
    expect(redo(undo(drawn(2))).announce).toBe(true);
    expect(drawn(1, undo(drawn(2))).announce).toBe(false);
  });
});
