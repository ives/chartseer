import { afterEach, describe, expect, it } from "vitest";
import { clearHandoff, handOff, peekHandoff } from "./handoff";

describe("handoff", () => {
  afterEach(clearHandoff);

  it("starts empty", () => {
    expect(peekHandoff()).toBeNull();
  });

  it("holds a file until it is cleared", () => {
    const file = { name: "sales.csv", csv: { columns: ["shop"], rows: [{ shop: "Brixton" }] } };
    handOff(file);
    expect(peekHandoff()).toBe(file);
    expect(peekHandoff()).toBe(file);
    clearHandoff();
    expect(peekHandoff()).toBeNull();
  });
});
