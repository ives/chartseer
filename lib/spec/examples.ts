import type { DatasetSummary } from "./columns";
import { bikesSummary, gelatoSummary } from "./fixtures";
import type { ChartSpec } from "./schema";

// Hand-written specs, each paired with the dataset it was written for.
// They show what the contract can express and double as test cases.

export const examples: { id: string; dataset: DatasetSummary; spec: ChartSpec }[] = [
  {
    id: "bikes-hourly-by-day-type",
    dataset: bikesSummary,
    spec: {
      version: 1,
      type: "line",
      title: "Weekday hires peak at rush hour; weekends peak in the afternoon",
      subtitle: "Journeys by starting hour",
      x: { field: "hour", label: "Hour of day" },
      y: { aggregate: "count", label: "Journeys" },
      series: { field: "day_type" },
    } satisfies ChartSpec,
  },
  {
    id: "bikes-busiest-areas",
    dataset: bikesSummary,
    spec: {
      version: 1,
      type: "bar",
      title: "The 15 busiest areas to start a hire",
      subtitle: "Journeys by start area",
      x: { field: "start_area", label: "Start area" },
      y: { aggregate: "count", label: "Journeys" },
      orientation: "horizontal",
      sort: "desc",
      limit: 15,
    } satisfies ChartSpec,
  },
  {
    id: "bikes-station-map",
    dataset: bikesSummary,
    spec: {
      version: 1,
      type: "scatter",
      title: "Where hires start",
      subtitle: "Each point is a journey, placed at its start station",
      x: { field: "start_lon", label: "Longitude" },
      y: { field: "start_lat", label: "Latitude" },
      group: { field: "bike_type" },
    } satisfies ChartSpec,
  },
  {
    id: "gelato-daily-2025",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "line",
      title: "Daily scoops by shop, 2025",
      x: { field: "date" },
      y: { field: "scoops", aggregate: "sum", label: "Scoops" },
      series: { field: "shop" },
      filters: [
        { field: "date", op: "gte", value: "2025-01-01" },
        { field: "date", op: "lte", value: "2025-12-31" },
      ],
      annotations: [{ kind: "range", from: "2025-06-19", to: "2025-07-01", label: "Heatwave" }],
    } satisfies ChartSpec,
  },
  {
    id: "gelato-weekday-by-shop",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "bar",
      title: "Scoops by day of the week",
      subtitle: "Canary Wharf is busiest on weekdays; every other shop peaks at the weekend",
      x: { field: "weekday", label: "Day" },
      y: { field: "scoops", aggregate: "sum", label: "Scoops" },
      series: { field: "shop" },
      layout: "stacked",
    } satisfies ChartSpec,
  },
  {
    id: "gelato-lemon-heat",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "scatter",
      title: "Amalfi Lemon sales rise with the temperature at Richmond Riverside",
      subtitle: "One point per day",
      x: { field: "max_temp_c", label: "Maximum temperature (°C)" },
      y: { field: "scoops", label: "Scoops" },
      group: { field: "weather" },
      filters: [
        { field: "shop", op: "eq", value: "Richmond Riverside" },
        { field: "flavour", op: "eq", value: "Amalfi Lemon" },
      ],
    } satisfies ChartSpec,
  },
  {
    id: "gelato-daily-heat",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "scatter",
      title: "Hotter days sell more gelato, up to about 30°C",
      subtitle: "One point per day · all shops and flavours, 2024–2025",
      per: { field: "date" },
      // The same on every row of a day, so the mean is that day's value.
      x: { field: "max_temp_c", aggregate: "mean", label: "Maximum temperature (°C)" },
      y: { field: "scoops", aggregate: "sum", label: "Scoops" },
    } satisfies ChartSpec,
  },
  {
    id: "gelato-revenue-by-flavour",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "bar",
      title: "Revenue by flavour",
      subtitle: "All shops, 2024–2025",
      x: { field: "flavour", label: "Flavour" },
      y: { field: "revenue_gbp", aggregate: "sum", label: "Revenue (£)" },
      orientation: "horizontal",
      sort: "desc",
    } satisfies ChartSpec,
  },
];
