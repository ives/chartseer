import { type ReactNode, createContext } from "react";

// Which view of the chart is shown: the plot, its table (D-029) or its spec (D-058).
export type ChartViewMode = "chart" | "table" | "spec";

// Set by the page around a chart: the view its own controls chose, and
// anything it adds under the plot, above the attribution (task 03).
// Without it, a chart shows its plot.
export type ChartChrome = { view: ChartViewMode; actions?: ReactNode };

export const ChartChromeContext = createContext<ChartChrome>({ view: "chart" });
