import { useId, useState } from "react";
import { Icon } from "@/components/landing/icon";
import { PRIVACY_NOTE } from "./upload-button";

// The short promise, which opens to the full disclosure of what is sent to the AI.
export function PrivacyNote({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 text-[13px] text-muted ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-11 items-center gap-[7px] self-start rounded-md underline-offset-2 hover:text-foreground hover:underline md:min-h-8 md:self-end"
      >
        <Icon name="lock" size={13} />
        Your file stays on this device
        <Icon name="chevron-down" size={12} className={open ? "rotate-180" : undefined} />
      </button>
      <p id={id} hidden={!open} className="max-w-md md:text-right">
        {PRIVACY_NOTE}
      </p>
    </div>
  );
}
