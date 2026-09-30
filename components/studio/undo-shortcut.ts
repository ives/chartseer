// Ctrl/Cmd+Z undoes a chart and Shift+Ctrl/Cmd+Z redoes one, except in a text
// field, which keeps its own text undo (D-044).
type ShortcutEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "target">;

const TEXT_FIELD = "input, textarea, [contenteditable]:not([contenteditable='false'])";

export function undoShortcut(event: ShortcutEvent): "undo" | "redo" | null {
  // Shift turns "z" into "Z".
  if (event.key.toLowerCase() !== "z" || !(event.ctrlKey || event.metaKey) || event.altKey) return null;
  if (event.target instanceof Element && event.target.closest(TEXT_FIELD)) return null;
  return event.shiftKey ? "redo" : "undo";
}
