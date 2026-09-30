// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gelatoSummary } from "@/lib/spec";
import { ChatPanel } from "./chat-panel";

const props: ComponentProps<typeof ChatPanel> = {
  messages: [],
  dataset: gelatoSummary,
  status: "ready",
  error: undefined,
  busy: false,
  onSend: () => {},
  onRetry: () => {},
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
