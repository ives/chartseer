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

const BIKES_ROWS = "About 25,000";
const BIKES_PERIOD = "January to May 2026";
const BIKES_SAMPLE_EVERY = 30.8;
const TFL_CREDIT = "Powered by TfL Open Data";

// The bundled demo datasets in public/data/. See docs/DATA.md.
export type BundledDataset = DatasetMeta & {
  path: string;
  attribution: string;
  // One line for the first screen.
  summary: string;
  // Facts the landing page shows; summary, note and attribution are built from them too.
  scale: string;
  period: string;
  // The short credit line, where the full attribution doesn't fit.
  credit: string;
  invented: boolean;
  // Sampled datasets keep one row in this many.
  sampleEvery?: number;
  // Requests offered as chips before the first chart; each measured valid by check-prompts (D-045).
  starters: readonly string[];
};

export const datasets: Record<"bikes" | "gelato", BundledDataset> = {
  bikes: {
    id: "bikes",
    title: "Santander Cycles journeys, London",
    path: "/data/bikes.csv",
    summary: `${BIKES_ROWS} Santander Cycles hires in London, ${BIKES_PERIOD}.`,
    scale: `${BIKES_ROWS} rows`,
    period: BIKES_PERIOD,
    credit: TFL_CREDIT,
    invented: false,
    sampleEvery: BIKES_SAMPLE_EVERY,
    starters: [
      "Journeys by hour of day, weekdays against weekends",
      "The 10 busiest start areas",
      "Median hire length by bike type",
      "Daily journeys against median hire length, weekdays and weekends",
    ],
    attribution: `${TFL_CREDIT}. Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights 2019.`,
    note: `A random sample of about 1 in ${BIKES_SAMPLE_EVERY} hires — counts are not TfL totals.`,
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
    scale: "Two years, five shops",
    period: "2024 to 2025",
    credit: "Every number is made up, even the weather",
    invented: true,
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
