"use client";

import { Icon } from "./icon";
import { useChooseFile } from "./upload-provider";

const styles = {
  // The hero and the "Got your own data?" strip.
  primary: "bg-accent text-accent-foreground",
  // On the closing dark panel.
  inverse: "bg-white text-ink-panel",
};

// Opens the file picker that UploadProvider owns.
export function UploadCsvButton({
  variant = "primary",
  icon = false,
  className = "",
}: {
  variant?: keyof typeof styles;
  icon?: boolean;
  className?: string;
}) {
  const choose = useChooseFile();
  return (
    <button
      type="button"
      onClick={choose}
      className={`inline-flex cursor-pointer items-center justify-center gap-2.5 font-medium ${styles[variant]} ${className}`}
    >
      {icon && <Icon name="upload" size={18} />}
      Upload a CSV
    </button>
  );
}
