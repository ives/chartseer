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
      title: "Journeys by hour of day, weekdays and weekends",
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
      title: "Top 15 start areas by journeys",
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
    id: "bikes-hourly-by-bike-type",
    dataset: bikesSummary,
    spec: {
      version: 1,
      type: "area",
      title: "Journeys by hour of day and bike type",
      x: { field: "hour", label: "Hour of day" },
      y: { aggregate: "count", label: "Journeys" },
      series: { field: "bike_type" },
      stacked: true,
    } satisfies ChartSpec,
  },
  {
    id: "bikes-station-duration",
    dataset: bikesSummary,
    spec: {
      version: 1,
      type: "scatter",
      title: "Median hire duration against journeys started",
      subtitle: "One point per start station",
      per: { field: "start_station" },
      // Hires per station span several orders of magnitude.
      x: { aggregate: "count", label: "Journeys started", scale: "log" },
      y: { field: "duration_min", aggregate: "median", label: "Median duration (min)" },
    } satisfies ChartSpec,
  },
  {
    id: "gelato-weekly-2025",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "line",
      title: "Weekly scoops by shop, 2025",
      // 2025 starts and ends on a Wednesday, so the first and last weeks are partial.
      x: { field: "date", timeUnit: "week" },
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
    id: "gelato-monthly-scoops",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "area",
      title: "Monthly scoops, 2024–2025",
      subtitle: "All shops",
      x: { field: "date", timeUnit: "month" },
      y: { field: "scoops", aggregate: "sum", label: "Scoops" },
    } satisfies ChartSpec,
  },
  {
    id: "gelato-weekday-by-shop",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "bar",
      title: "Scoops by day of the week",
      subtitle: "By shop, 2024–2025",
      x: { field: "weekday", label: "Day" },
      y: { field: "scoops", aggregate: "sum", label: "Scoops" },
      series: { field: "shop" },
      layout: "stacked",
    } satisfies ChartSpec,
  },
  {
    id: "gelato-monthly-revenue",
    dataset: gelatoSummary,
    spec: {
      version: 1,
      type: "bar",
      title: "Monthly revenue by shop",
      subtitle: "2024–2025",
      x: { field: "date", timeUnit: "month" },
      y: { field: "revenue_gbp", aggregate: "sum", label: "Revenue (£)" },
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
      title: "Amalfi Lemon scoops against peak temperature, Richmond Riverside",
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
      title: "Daily scoops against peak temperature",
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
