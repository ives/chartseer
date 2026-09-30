import { useId } from "react";
import { type BundledDataset, datasets } from "@/lib/data/datasets";

export type DatasetId = keyof typeof datasets;

const UPLOAD = "upload";

type DatasetPickerProps = {
  value: DatasetId | typeof UPLOAD;
  // The uploaded file's name, listed as a choice while it is loaded.
  upload: string | null;
  onChange: (id: DatasetId) => void;
};

export function DatasetPicker({ value, upload, onChange }: DatasetPickerProps) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted">
        Dataset
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          if (event.target.value !== UPLOAD) onChange(event.target.value as DatasetId);
        }}
        className="max-w-[16rem] rounded-md border border-border bg-background px-2 py-1 focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {upload !== null && <option value={UPLOAD}>{upload}</option>}
        {Object.values(datasets).map((meta: BundledDataset) => (
          <option key={meta.id} value={meta.id}>
            {meta.title}
          </option>
        ))}
      </select>
    </div>
  );
}
