import type { InferMeta } from "./infer";
import type { LabelMeta } from "./labels";

// The bundled demo datasets in public/data/. See docs/DATA.md.
export type DatasetMeta = InferMeta & LabelMeta & {
  id: string;
  title: string;
  path: string;
  // Must be shown wherever the dataset is displayed.
  attribution: string;
  note?: string;
};

export const datasets: Record<"bikes" | "gelato", DatasetMeta> = {
  bikes: {
    id: "bikes",
    title: "Santander Cycles journeys, London",
    path: "/data/bikes.csv",
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
