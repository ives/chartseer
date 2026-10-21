import { useId } from "react";
import { Icon } from "@/components/landing/icon";

export const PRIVACY_NOTE =
  "Your file stays on your device. Column names and a few sample rows are sent to the AI to understand your data.";

type UploadButtonProps = {
  onFile: (file: File) => void;
  label?: string;
  // Only the icon shows on a phone, as in the workspace header.
  compact?: boolean;
  // The accent button in the first screen's upload strip.
  primary?: boolean;
};

// A file picker styled as a button. Studio reads the file and reports any error.
export function UploadButton({ onFile, label = "Upload Own CSV", compact = false, primary = false }: UploadButtonProps) {
  const id = useId();
  return (
    <div className="text-sm">
      <input
        id={id}
        type="file"
        accept=".csv,text/csv"
        aria-label={compact ? label : undefined}
        className="peer sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file again still fires a change.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <label
        htmlFor={id}
        className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[11px] font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${
          primary
            ? "min-h-12 bg-accent px-5 text-[15px] text-accent-foreground md:min-h-[46px]"
            : "border border-border bg-card hover:border-border-strong"
        } ${compact ? "size-11 md:size-auto md:px-4" : primary ? "" : "px-4"}`}
      >
        <Icon name="upload" size={compact ? 18 : 16} />
        <span className={compact ? "max-md:sr-only" : undefined}>{label}</span>
      </label>
    </div>
  );
}
