// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { undoShortcut } from "./undo-shortcut";

function press(init: Partial<KeyboardEventInit>, target: EventTarget = document.body) {
  const event = { key: "z", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...init, target };
  return undoShortcut(event as KeyboardEvent);
}

describe("undoShortcut", () => {
  it.each([
    [{ ctrlKey: true }, "undo"],
    [{ metaKey: true }, "undo"],
    [{ ctrlKey: true, shiftKey: true, key: "Z" }, "redo"],
    [{ metaKey: true, shiftKey: true, key: "Z" }, "redo"],
  ] as const)("reads %j as %s", (init, expected) => {
    expect(press(init)).toBe(expected);
  });

  it.each([{}, { key: "y", ctrlKey: true }, { ctrlKey: true, altKey: true }])("ignores %j", (init) => {
    expect(press(init)).toBeNull();
  });

  it.each(["<textarea></textarea>", "<input>", '<div contenteditable="true"><span></span></div>'])(
    "leaves text undo to %s",
    (html) => {
      document.body.innerHTML = html;
      const target = document.body.querySelector("span") ?? document.body.firstElementChild;
      expect(press({ ctrlKey: true }, target ?? document.body)).toBeNull();
    },
  );

  it("acts on a button", () => {
    document.body.innerHTML = "<button>Undo</button>";
    expect(press({ metaKey: true }, document.body.querySelector("button") ?? document.body)).toBe("undo");
  });
});
