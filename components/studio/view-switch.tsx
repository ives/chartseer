import type { ChartViewMode } from "@/components/charts/chart-chrome";

const VIEWS: { view: ChartViewMode; label: string }[] = [
  { view: "chart", label: "Chart" },
  { view: "table", label: "Table" },
  { view: "spec", label: "Spec" },
];

// Chart, its table (D-029) or its spec (D-058): one choice, three buttons.
export function ViewSwitch({ view, onChange }: { view: ChartViewMode; onChange: (view: ChartViewMode) => void }) {
  return (
    <div role="group" aria-label="View" className="inline-flex rounded-[11px] bg-surface-track p-[3px]">
      {VIEWS.map((option) => (
        <button
          key={option.view}
          type="button"
          aria-pressed={view === option.view}
          onClick={() => onChange(option.view)}
          className="min-h-11 rounded-lg px-3 text-[13px] font-medium text-secondary aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_rgba(17,17,16,0.08)] md:min-h-[34px] md:px-3.5"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
