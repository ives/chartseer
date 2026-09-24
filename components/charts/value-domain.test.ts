import { describe, expect, it } from "vitest";
import { valueDomain } from "./value-domain";

describe("valueDomain", () => {
  it("starts positive values at zero and ignores nulls", () => {
    expect(valueDomain([3, null, 8])).toEqual([0, 8]);
  });

  it("ends negative values at zero", () => {
    expect(valueDomain([-4, -1])).toEqual([-4, 0]);
  });

  it("spans zero to one when there is nothing to show", () => {
    expect(valueDomain([null, 0])).toEqual([0, 1]);
  });
});
