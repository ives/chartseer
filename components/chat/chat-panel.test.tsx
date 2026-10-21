// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";
import { type ChartSpec, MAX_CONVERSATION_MESSAGES, examples, gelatoSummary } from "@/lib/spec";
import type { ChartseerMessage } from "./messages";
import { ChatPanel } from "./chat-panel";

const props: ComponentProps<typeof ChatPanel> = {
  messages: [],
  dataset: gelatoSummary,
  status: "ready",
  error: undefined,
  busy: false,
  onSend: () => {},
  onRetry: () => {},
  onNewChat: () => {},
  links: { shown: undefined, reachable: [], canShow: true, onShow: () => {} },
  privacyNote: "Your file stays on your device. Column names and a few sample rows are sent to the AI.",
};

function goOffline(offline: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(!offline);
  act(() => {
    window.dispatchEvent(new Event(offline ? "offline" : "online"));
  });
}

describe("ChatPanel offline", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = () => {};
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function typeAndFindSend() {
    fireEvent.change(screen.getByLabelText("Describe a chart"), { target: { value: "Scoops by shop" } });
    return screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
  }

  it("says so and holds sending until the connection is back", () => {
    render(<ChatPanel {...props} />);
    expect(typeAndFindSend().disabled).toBe(false);

    goOffline(true);
    expect(screen.getByText("You’re offline. Chartseer will work again when your connection is back.")).toBeTruthy();
    expect(typeAndFindSend().disabled).toBe(true);

    goOffline(false);
    expect(screen.queryByText(/You’re offline/)).toBeNull();
    expect(typeAndFindSend().disabled).toBe(false);
  });

  it("explains a failed request by whether the device is offline, with a retry", () => {
    const onRetry = vi.fn();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<ChatPanel {...props} error={new TypeError("Failed to fetch")} onRetry={onRetry} />);
    expect(screen.getByText("You’re offline. Check your connection, then try again.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("ChatPanel limits", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = () => {};
  });
  afterEach(cleanup);

  it("shows a limit as an error, without a retry", () => {
    const limited = new APICallError({ message: "x", url: "/api/chat", requestBodyValues: undefined, statusCode: 429, responseBody: '{"code":"daily_limit"}' });
    render(<ChatPanel {...props} error={limited} />);
    expect(screen.getByRole("alert").textContent).toBe("The demo has had a busy day — try again tomorrow.");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("offers a new chat in place of the input once the chat is full", () => {
    const onNewChat = vi.fn();
    const messages = Array.from({ length: MAX_CONVERSATION_MESSAGES }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      parts: [{ type: "text" as const, text: `Message ${i}` }],
    }));
    render(<ChatPanel {...props} messages={messages} onNewChat={onNewChat} />);
    expect(screen.queryByLabelText("Describe a chart")).toBeNull();
    expect(screen.getByText("This chat has reached 40 messages. Start a new chat to continue.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start a new chat" }));
    expect(onNewChat).toHaveBeenCalled();
  });

  it("puts the cursor in the input of a new chat, once the data has loaded", () => {
    const { rerender } = render(<ChatPanel {...props} dataset={null} focusOnMount />);
    expect(document.activeElement).toBe(document.body);
    rerender(<ChatPanel {...props} focusOnMount />);
    expect(document.activeElement).toBe(screen.getByLabelText("Describe a chart"));
  });
});

describe("ChatPanel chart chips", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = () => {};
  });
  afterEach(cleanup);

  const specs = examples.filter((e) => e.dataset === gelatoSummary).slice(0, 3).map((e) => e.spec);
  // A request and a reply that drew each spec, in order.
  const messages: ChartseerMessage[] = specs.flatMap((spec: ChartSpec, i) => [
    { id: `u${i}`, role: "user" as const, parts: [{ type: "text" as const, text: `Request ${i}` }] },
    {
      id: `a${i}`,
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: `Reply ${i}` },
        {
          type: "tool-renderChart" as const,
          toolCallId: `c${i}`,
          state: "output-available" as const,
          input: { spec },
          output: { ok: true as const, spec },
        },
      ],
    },
  ]);

  it("numbers charts in order of drawing and marks the one on screen", () => {
    render(<ChatPanel {...props} messages={messages} links={{ ...props.links, shown: 2, reachable: [0, 1, 2] }} />);
    const chips = screen.getAllByRole("button", { name: /^Chart \d ·/ });
    expect(chips.map((c) => c.textContent)).toEqual(specs.map((spec, i) => `Chart ${i + 1} · ${spec.title}`));
    expect(chips.map((c) => c.getAttribute("aria-current"))).toEqual([null, null, "true"]);
    expect(screen.queryByText(/^Drew:/)).toBeNull();
  });

  it("keeps a replaced chart's number, but not as a control", () => {
    // Chart 2 was undone, then chart 3 replaced it.
    render(<ChatPanel {...props} messages={messages} links={{ ...props.links, shown: 2, reachable: [0, 2] }} />);
    const chips = screen.getAllByRole("button", { name: /^Chart \d ·/ });
    expect(chips.map((c) => c.textContent?.slice(0, 7))).toEqual(["Chart 1", "Chart 3"]);
    const replaced = screen.getByText(`Chart 2 ·`).parentElement?.parentElement;
    expect(replaced?.tagName).toBe("SPAN");
    expect(replaced?.getAttribute("aria-current")).toBeNull();
    expect(within(replaced as HTMLElement).getByText("(replaced)")).toBeTruthy();
  });

  it("shows a chart when its chip is clicked, but not during a request", () => {
    const onShow = vi.fn();
    const links = { shown: 2, reachable: [0, 1, 2], canShow: true, onShow };
    const { rerender } = render(<ChatPanel {...props} messages={messages} links={links} />);
    fireEvent.click(screen.getByRole("button", { name: `Chart 1 · ${specs[0]?.title}` }));
    expect(onShow).toHaveBeenCalledWith(0);

    rerender(<ChatPanel {...props} messages={messages} links={{ ...links, canShow: false }} />);
    expect((screen.getByRole("button", { name: `Chart 1 · ${specs[0]?.title}` }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says what is sent to the AI before the first message", () => {
    render(<ChatPanel {...props} />);
    expect(screen.getByText(props.privacyNote)).toBeTruthy();
  });
});
