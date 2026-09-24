import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { datasets } from "./datasets";
import { parseCsv } from "./parse";

describe("bundled dataset labels", () => {
  for (const meta of Object.values(datasets)) {
    it(`labels exactly the columns of ${meta.id}.csv`, () => {
      const header = readFileSync(`public/data/${meta.id}.csv`, "utf8").split("\n", 1)[0] ?? "";
      const { columns } = parseCsv(`${header}\n`);
      expect(Object.keys(meta.columnLabels ?? {}).sort()).toEqual([...columns].sort());
    });
  }
});
