import type { InferMeta } from "./infer";

// The bundled demo datasets in public/data/. See docs/DATA.md.
export type DatasetMeta = InferMeta & {
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
  },
  gelato: {
    id: "gelato",
    title: "Gelateria Nebbia",
    path: "/data/gelato.csv",
    attribution: "Invented data for a fictional gelato chain.",
  },
};
