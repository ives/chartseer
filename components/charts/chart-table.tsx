import { useId } from "react";
import { formatNumber, formatXValue } from "@/lib/data/describe";
import type { CartesianData, ChartData, ScatterData } from "@/lib/data/prepare";

type ChartTableProps = {
  title: string;
  data: ChartData;
};

// The chart's data as an accessible table: the "view as table" side of every
// chart (ARCHITECTURE §10). It shows the prepared data, so it matches the plot.
export function ChartTable({ title, data }: ChartTableProps) {
  const captionId = useId();
  return (
    // Focusable, so a keyboard can scroll a long table.
    <div role="region" aria-labelledby={captionId} tabIndex={0} className="max-h-96 overflow-auto rounded border border-(--chart-grid) text-sm">
      <table className="w-full border-collapse tabular-nums">
        <caption id={captionId} className="sr-only">
          {title}
        </caption>
        {data.type === "scatter" ? <ScatterRows data={data} /> : <CartesianRows data={data} />}
      </table>
    </div>
  );
}

const headClass = "sticky top-0 border-b border-(--chart-axis) bg-background px-3 py-1.5 font-semibold";
const cellClass = "border-b border-(--chart-grid) px-3 py-1 text-right";
const rowHeadClass = "border-b border-(--chart-grid) px-3 py-1 text-left font-normal";

function CartesianRows({ data }: { data: CartesianData }) {
  return (
    <>
      <thead>
        <tr>
          <th scope="col" className={`${headClass} text-left`}>
            {data.x.label}
          </th>
          {data.series.map((s) => (
            <th key={String(s.key)} scope="col" className={`${headClass} text-right`}>
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.x.values.map((value, i) => (
          <tr key={String(value)}>
            <th scope="row" className={rowHeadClass}>
              {formatXValue(value, data.x.kind, data.x.timeUnit)}
              {data.x.partial?.[i] && " (partial)"}
            </th>
            {data.series.map((s) => {
              const v = s.values[i] ?? null;
              return (
                <td key={String(s.key)} className={cellClass}>
                  {v === null ? <Missing /> : formatNumber(v)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </>
  );
}

function ScatterRows({ data }: { data: ScatterData }) {
  const { per, groupLabel } = data;
  return (
    <>
      <thead>
        <tr>
          {per && (
            <th scope="col" className={`${headClass} text-left`}>
              {per.label}
            </th>
          )}
          {groupLabel && (
            <th scope="col" className={`${headClass} text-left`}>
              {groupLabel}
            </th>
          )}
          <th scope="col" className={`${headClass} text-right`}>
            {data.x.label}
          </th>
          <th scope="col" className={`${headClass} text-right`}>
            {data.y.label}
          </th>
        </tr>
      </thead>
      <tbody>
        {data.groups.flatMap((g) =>
          g.points.map((p, i) => (
            <tr key={`${String(g.key)}-${i}`}>
              {per && (
                <th scope="row" className={rowHeadClass}>
                  {p.per === undefined ? <Missing /> : formatXValue(p.per, per.kind)}
                </th>
              )}
              {groupLabel && <td className={`${cellClass} text-left`}>{g.label}</td>}
              <td className={cellClass}>{formatNumber(p.x)}</td>
              <td className={cellClass}>{formatNumber(p.y)}</td>
            </tr>
          )),
        )}
      </tbody>
    </>
  );
}

function Missing() {
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">no data</span>
    </>
  );
}
