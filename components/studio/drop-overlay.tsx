import { Icon } from "@/components/landing/icon";
import { PRIVACY_NOTE } from "./upload-button";

// Shown while a file is dragged over the page.
export function DropOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-3 z-20 flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-accent bg-page/92 p-6 text-center backdrop-blur-sm md:inset-4"
    >
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon name="upload" size={22} />
      </span>
      <p className="font-serif text-2xl font-semibold tracking-[-0.01em]">Drop a CSV file to load it</p>
      <p className="max-w-md text-sm text-secondary">{PRIVACY_NOTE}</p>
    </div>
  );
}
