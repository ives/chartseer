import type { InferMeta } from "./infer";
import type { LabelMeta } from "./labels";

// What the app knows about a dataset beyond its rows: a bundled one or an upload.
export type DatasetMeta = InferMeta & LabelMeta & {
  id: string;
  title: string;
  // Must be shown wherever the dataset is displayed.
  attribution?: string;
  note?: string;
};

// The bundled demo datasets in public/data/. See docs/DATA.md.
export type BundledDataset = DatasetMeta & {
  path: string;
  attribution: string;
  // One line for the first screen.
  summary: string;
  // Requests offered as chips before the first chart; each measured valid by check-prompts (D-045).
  starters: readonly string[];
};

export const datasets: Record<"bikes" | "gelato", BundledDataset> = {
  bikes: {
    id: "bikes",
    title: "Santander Cycles journeys, London",
    path: "/data/bikes.csv",
    summary: "About 25,000 Santander Cycles hires in London, January to May 2026.",
    starters: [
      "Journeys by hour of day, weekdays against weekends",
      "The 10 busiest start areas",
      "Median hire length by bike type",
      "Daily journeys against median hire length, weekdays and weekends",
    ],
    attribution:
      "Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights 2019.",
    note: "A random sample of about 1 in 30.8 hires — counts are not TfL totals.",
    columnOrder: { season: ["Winter", "Spring", "Summer", "Autumn"] },
    rowLabel: "Journeys",
    columnLabels: {
      start_time: "Start time",
      date: "Date",
      weekday: "Day of the week",
      day_type: "Day type",
      hour: "Hour of day",
      season: "Season",
      start_station: "Start station",
      start_area: "Start area",
      start_lat: "Start latitude",
      start_lon: "Start longitude",
      end_station: "End station",
      end_area: "End area",
      end_lat: "End latitude",
      end_lon: "End longitude",
      round_trip: "Round trip",
      duration_min: "Duration (min)",
      bike_type: "Bike type",
    },
  },
  gelato: {
    id: "gelato",
    title: "Gelateria Nebbia",
    path: "/data/gelato.csv",
    summary: "Two years of daily sales at an invented five-shop gelato chain.",
    starters: [
      "Daily revenue by shop in 2025",
      "Scoops against peak temperature",
      "Which flavours bring in the most revenue? Top 5",
      "Monthly scoops of sorbet versus gelato",
    ],
    attribution: "Invented data for a fictional gelato chain.",
    columnLabels: {
      date: "Date",
      weekday: "Day of the week",
      shop: "Shop",
      flavour: "Flavour",
      flavour_type: "Flavour type",
      scoops: "Scoops",
      revenue_gbp: "Revenue (£)",
      max_temp_c: "Peak temperature (°C)",
      rain_mm: "Rainfall (mm)",
      weather: "Weather",
      school_holiday: "School holiday",
      bank_holiday: "Bank holiday",
    },
  },
};
