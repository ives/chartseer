// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";
import { MAX_CONVERSATION_MESSAGES, gelatoSummary } from "@/lib/spec";
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
