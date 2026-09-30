import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The dark theme is declared twice in globals.css: for the system setting,
// and for html[data-theme="dark"], which the dev gallery uses to force it
// (D-049). The two must never drift apart.
const css = readFileSync("app/globals.css", "utf8");

function declarations(block: string): string[] {
  return block
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
}

function blockAfter(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block`);
  const open = css.indexOf("{", start) + 1;
  return css.slice(open, css.indexOf("}", open));
}

describe("the dark theme", () => {
  it("is the same whether the system asks for it or the page forces it", () => {
    const system = declarations(blockAfter(':root:not([data-theme="light"])'));
    const forced = declarations(blockAfter(':root[data-theme="dark"]'));
    expect(system.length).toBeGreaterThan(20);
    expect(forced).toEqual(system);
  });
});
