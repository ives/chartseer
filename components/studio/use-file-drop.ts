import { type DragEvent, useState } from "react";

export const ONE_FILE = "Drop one file at a time.";

function hasFiles(event: DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

// Dropping a file anywhere on a page. Spread `handlers` on its outermost element.
export function useFileDrop(onFile: (file: File) => void, onError: (message: string) => void) {
  const [dragging, setDragging] = useState(false);

  const handlers = {
    onDragOver(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave(event: DragEvent) {
      // Leaving for a child element isn't leaving the page.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setDragging(false);
      const files = event.dataTransfer.files;
      const file = files[0];
      if (files.length !== 1 || !file) onError(ONE_FILE);
      else onFile(file);
    },
  };

  return { dragging, handlers };
}
