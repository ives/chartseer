// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createUIMessageStreamResponse, simulateReadableStream, toUIMessageStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseChatRequest, streamChart } from "@/lib/ai/chat";
import { type ChartSpec, examples, gelatoSummary } from "@/lib/spec";
import { useChartseerChat } from "./use-chartseer-chat";

type StreamResult = Extract<NonNullable<ConstructorParameters<typeof MockLanguageModelV4>[0]>["doStream"], unknown[]>[number];

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

function toolCall(spec: ChartSpec): StreamResult {
  return {
    stream: simulateReadableStream({
      chunks: [
        { type: "tool-call", toolCallId: `call-${spec.title}`, toolName: "renderChart", input: JSON.stringify({ spec }) },
        { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
      ],
    }),
  };
}

function example(id: string): ChartSpec {
  const spec = examples.find((e) => e.id === id)?.spec;
  if (!spec) throw new Error(`No example ${id}`);
  return spec;
}

const weekly = example("gelato-weekly-2025");
const monthly = example("gelato-monthly-scoops");
if (weekly.type !== "line") throw new Error("gelato-weekly-2025 should be a line chart");
const stackedWeekly: ChartSpec = { ...weekly, type: "area", stacked: true, title: "Weekly scoops by shop, 2025, stacked" };

// Stands in for /api/chat: the same parsing and streaming as the route, with a mock model.
function serveWith(model: MockLanguageModelV4) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      const parsed = await parseChatRequest(JSON.parse(String(init?.body)));
      if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });
      const result = await streamChart(parsed.request, model);
      return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
    }),
  );
}

describe("useChartseerChat undo", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("builds a refinement after an undo on the restored spec, and drops the redo step", async () => {
    const model = new MockLanguageModelV4({ doStream: [toolCall(weekly), toolCall(monthly), toolCall(stackedWeekly)] });
    serveWith(model);
    const { result } = renderHook(() => useChartseerChat(gelatoSummary));

    async function send(text: string, title: string) {
      act(() => result.current.send(text));
      await waitFor(() => {
        expect(result.current.busy).toBe(false);
        expect(result.current.currentSpec?.title).toBe(title);
      });
    }

    await send("Weekly scoops by shop in 2025", weekly.title);
    await send("Monthly scoops instead", monthly.title);

    act(() => result.current.undo());
    expect(result.current.currentSpec?.title).toBe(weekly.title);
    expect(result.current.announcement).toBe(`Showing chart 1 of 2: ${weekly.title}`);
    expect(result.current.canRedo).toBe(true);

    await send("Make it stacked", stackedWeekly.title);

    // The third request carried the restored chart as the current spec, not the monthly one.
    const prompt = model.doStreamCalls[2]?.prompt ?? [];
    const current = String(prompt.filter((m) => m.role === "system")[2]?.content);
    expect(current).toContain(JSON.stringify(weekly.title));
    expect(current).not.toContain(JSON.stringify(monthly.title));

    // And the conversation says so, just before the user's words; only that message does.
    const said = prompt
      .filter((m) => m.role === "user")
      .map((m) => (Array.isArray(m.content) ? m.content.map((p) => (p.type === "text" ? p.text : "")).join(" | ") : ""));
    expect(said).toEqual([
      "Weekly scoops by shop in 2025",
      "Monthly scoops instead",
      `The user went back to the chart '${weekly.title}'. Later charts are no longer shown. | Make it stacked`,
    ]);
    expect(result.current.messages.at(-2)?.parts[0]).toEqual({ type: "data-back-to", data: { title: weekly.title } });

    // The monthly chart was the redo step; the new chart replaced it.
    expect(result.current.canRedo).toBe(false);
    expect(result.current.announcement).toBe("");
    act(() => result.current.undo());
    expect(result.current.currentSpec?.title).toBe(weekly.title);
    expect(result.current.announcement).toBe(`Showing chart 1 of 2: ${weekly.title}`);
  });
});
