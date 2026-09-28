import { describe, expect, it } from "vitest";
import { type ChartSpec, ChartSpec as ChartSpecSchema, DatasetSummary, examples, gelatoSummary } from "@/lib/spec";
import { type ChartseerMessage, buildChatBody, chartHistory, isDrawing, specsIn, textOf } from "./messages";

const weekly = examples.find((e) => e.id === "gelato-weekly-2025")?.spec as ChartSpec;
const monthly = examples.find((e) => e.id === "gelato-monthly-scoops")?.spec as ChartSpec;

const user = (text: string): ChartseerMessage => ({ id: `u-${text}`, role: "user", parts: [{ type: "text", text }] });

type Part = ChartseerMessage["parts"][number];

function assistant(...parts: Part[]): ChartseerMessage {
  return { id: `a-${Math.random()}`, role: "assistant", parts };
}

const text = (t: string): Part => ({ type: "text", text: t });
const drawn = (spec: unknown): Part => ({
  type: "tool-renderChart",
  toolCallId: `call-${Math.random()}`,
  state: "output-available",
  input: { spec },
  output: { ok: true, spec: spec as ChartSpec },
});
const rejected = (errors: string[]): Part => ({
  type: "tool-renderChart",
  toolCallId: `call-${Math.random()}`,
  state: "output-available",
  input: {},
  output: { ok: false, errors },
});
const streaming: Part = { type: "tool-renderChart", toolCallId: "call-s", state: "input-streaming", input: undefined };

describe("buildChatBody", () => {
  it("sends exactly the messages, the dataset summary and the current spec", () => {
    const messages = [user("Weekly scoops by shop")];
    const body = buildChatBody(messages, { dataset: gelatoSummary, currentSpec: weekly });
    expect(Object.keys(body).sort()).toEqual(["currentSpec", "dataset", "messages"]);
    expect(body.messages).toBe(messages);
    expect(DatasetSummary.safeParse(body.dataset).success).toBe(true);
    expect(ChartSpecSchema.nullable().safeParse(body.currentSpec).success).toBe(true);
  });

  it("drops anything else in the context", () => {
    const context = { dataset: gelatoSummary, currentSpec: null, extra: 1 };
    expect(Object.keys(buildChatBody([], context)).sort()).toEqual(["currentSpec", "dataset", "messages"]);
  });

  it("sends null before any chart is drawn", () => {
    expect(buildChatBody([user("hi")], { dataset: gelatoSummary, currentSpec: null }).currentSpec).toBeNull();
  });
});

describe("chartHistory", () => {
  it("adds the spec from a valid tool result", () => {
    const messages = [user("Weekly scoops"), assistant(text("Drawing weekly scoops."), drawn(weekly))];
    expect(chartHistory(messages, gelatoSummary)).toEqual([weekly]);
  });

  it("leaves the history unchanged after an invalid tool result", () => {
    const before = [user("Weekly scoops"), assistant(drawn(weekly))];
    const after = [...before, user("Now by flavor"), assistant(rejected(['series.field: there is no column "flavor"']), text("I couldn't."))];
    expect(chartHistory(after, gelatoSummary)).toEqual(chartHistory(before, gelatoSummary));
  });

  it("keeps the retry's spec when the first attempt failed", () => {
    const messages = [user("Weekly scoops"), assistant(rejected(["x"]), drawn(weekly))];
    expect(chartHistory(messages, gelatoSummary)).toEqual([weekly]);
  });

  it("skips an ok result that doesn't pass parseSpec for this dataset", () => {
    const wrongColumn = { ...weekly, series: { field: "start_area" } };
    expect(chartHistory([assistant(drawn(wrongColumn))], gelatoSummary)).toEqual([]);
  });

  it("lists charts oldest first", () => {
    const messages = [user("a"), assistant(drawn(weekly)), user("b"), assistant(drawn(monthly))];
    expect(chartHistory(messages, gelatoSummary)).toEqual([weekly, monthly]);
  });

  it("ignores a call still streaming", () => {
    expect(specsIn(assistant(streaming), gelatoSummary)).toEqual([]);
  });
});

describe("isDrawing", () => {
  it("is true while a renderChart call streams", () => {
    expect(isDrawing([user("a"), assistant(text("Drawing."), streaming)], "streaming")).toBe(true);
  });

  it("is false once the result is in", () => {
    expect(isDrawing([user("a"), assistant(drawn(weekly))], "streaming")).toBe(false);
  });

  it("is false when the request has failed or finished", () => {
    const messages = [user("a"), assistant(streaming)];
    expect(isDrawing(messages, "error")).toBe(false);
    expect(isDrawing(messages, "ready")).toBe(false);
  });

  it("is false while only text streams", () => {
    expect(isDrawing([user("a"), assistant(text("Hmm"))], "streaming")).toBe(false);
  });
});

describe("textOf", () => {
  it("joins the text parts and skips tool parts", () => {
    expect(textOf(assistant(text("Drawing "), drawn(weekly), text("it.")))).toBe("Drawing it.");
  });
});
