import { PRIVACY_NOTE } from "./upload-button";

// Shown while a file is dragged over the page.
export function DropOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-4 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground bg-background/90 p-6 text-center"
    >
      <p className="text-lg font-medium">Drop a CSV file to load it</p>
      <p className="max-w-md text-sm text-muted">{PRIVACY_NOTE}</p>
    </div>
  );
}
