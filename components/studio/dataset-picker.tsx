import { useId } from "react";
import { type DatasetMeta, datasets } from "@/lib/data/datasets";

export type DatasetId = keyof typeof datasets;

export function DatasetPicker({ value, onChange }: { value: DatasetId; onChange: (id: DatasetId) => void }) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted">
        Dataset
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as DatasetId)}
        className="rounded-md border border-border bg-background px-2 py-1 focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {Object.values(datasets).map((meta: DatasetMeta) => (
          <option key={meta.id} value={meta.id}>
            {meta.title}
          </option>
        ))}
      </select>
    </div>
  );
}
