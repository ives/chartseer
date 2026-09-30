// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { gelatoSummary } from "@/lib/spec";
import { ChatMessage } from "./chat-message";
import type { ChartseerMessage } from "./messages";

function user(parts: ChartseerMessage["parts"]): ChartseerMessage {
  return { id: "m1", role: "user", parts };
}

describe("ChatMessage", () => {
  afterEach(cleanup);

  it("shows where the user went back to, above their words", () => {
    render(
      <ChatMessage
        message={user([
          { type: "data-back-to", data: { title: "Weekly scoops by shop, 2025" } },
          { type: "text", text: "Make it stacked" },
        ])}
        dataset={gelatoSummary}
      />,
    );
    const [event, words] = screen.getAllByText(/Back to:|Make it stacked/);
    expect(event?.textContent).toBe("↩ Back to: Weekly scoops by shop, 2025");
    expect(words?.textContent).toBe("You: Make it stacked");
  });

  it("shows no event on an ordinary message", () => {
    render(<ChatMessage message={user([{ type: "text", text: "Make it stacked" }])} dataset={gelatoSummary} />);
    expect(screen.queryByText(/Back to:/)).toBeNull();
  });
});
