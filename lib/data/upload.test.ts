import { describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_BYTES, checkFile, readUpload } from "./upload";

describe("checkFile", () => {
  it.each(["sales.csv", "SALES.CSV"])("accepts %s", (name) => {
    expect(checkFile({ name, size: 100 })).toBeNull();
  });

  it.each(["sales.xlsx", "sales.txt", "sales.csv.zip", "csv"])("rejects %s", (name) => {
    expect(checkFile({ name, size: 100 })).toMatch(/^This doesn’t look like a CSV file/);
  });

  it("accepts exactly 5 MB and rejects a byte more", () => {
    expect(checkFile({ name: "a.csv", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(checkFile({ name: "a.csv", size: MAX_UPLOAD_BYTES + 1 })).toBe("This file is 5.1 MB; the limit is 5 MB.");
    expect(checkFile({ name: "a.csv", size: 7.2 * 1024 * 1024 })).toBe("This file is 7.2 MB; the limit is 5 MB.");
  });
});

describe("readUpload", () => {
  const file = (name: string, text: string, size = text.length) => ({ name, size, text: async () => text });

  it("reads a valid file", async () => {
    expect(await readUpload(file("a.csv", "shop,scoops\nBrixton,10\n"))).toMatchObject({ ok: true });
  });

  it("rejects a large file without reading it", async () => {
    const text = vi.fn(async () => "a,b\n1,2\n");
    const result = await readUpload({ name: "a.csv", size: MAX_UPLOAD_BYTES + 1, text });
    expect(result).toEqual({ ok: false, message: "This file is 5.1 MB; the limit is 5 MB." });
    expect(text).not.toHaveBeenCalled();
  });

  it("passes on readCsv's message", async () => {
    expect(await readUpload(file("a.csv", "a,b\n1\n"))).toEqual({
      ok: false,
      message: "Row 2 has 1 value, but the header has 2. Check for a missing or extra separator.",
    });
  });
});
