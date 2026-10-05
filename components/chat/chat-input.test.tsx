// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatInput } from "./chat-input";

function setup({ busy = false, disabled = false } = {}) {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} busy={busy} disabled={disabled} />);
  const box = screen.getByLabelText("Describe a chart");
  fireEvent.change(box, { target: { value: "  Weekly scoops by shop  " } });
  return { onSend, box };
}

describe("ChatInput", () => {
  afterEach(cleanup);

  it("sends the trimmed text on Enter and clears the box", () => {
    const { onSend, box } = setup();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Weekly scoops by shop");
    expect((box as HTMLTextAreaElement).value).toBe("");
  });

  it("doesn't send on Shift+Enter", () => {
    const { onSend } = setup();
    fireEvent.keyDown(screen.getByLabelText("Describe a chart"), { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("doesn't send while an IME composition is confirmed", () => {
    const { onSend, box } = setup();
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("keeps the text but doesn't send while a reply streams", () => {
    const { onSend, box } = setup({ busy: true });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    expect((box as HTMLTextAreaElement).value).toContain("Weekly scoops");
    expect(box.hasAttribute("disabled")).toBe(false);
  });

  it("sends from the button", () => {
    const { onSend } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("won't send blank text", () => {
    const { onSend, box } = setup();
    fireEvent.change(box, { target: { value: "   " } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("takes at most 2,000 characters, and shows the count near the limit", () => {
    const { box } = setup();
    expect(box.getAttribute("maxlength")).toBe("2000");
    expect(screen.queryByText(/\/ 2,000/)).toBeNull();
    fireEvent.change(box, { target: { value: "x".repeat(1850) } });
    const count = screen.getByText("1,850 / 2,000");
    expect(box.getAttribute("aria-describedby")).toBe(count.id);
  });
});
