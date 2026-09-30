import { useId } from "react";

export const PRIVACY_NOTE =
  "Your file stays on your device. Column names and a few sample rows are sent to the AI to understand your data.";

// A file picker styled as a button. Studio reads the file and reports any error.
export function UploadButton({ onFile }: { onFile: (file: File) => void }) {
  const id = useId();
  return (
    <div className="text-sm">
      <input
        id={id}
        type="file"
        accept=".csv,text/csv"
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
        className="cursor-pointer rounded-md border border-border px-2 py-1 peer-focus-visible:outline-2 peer-focus-visible:outline-foreground"
      >
        Upload Own CSV
      </label>
    </div>
  );
}
