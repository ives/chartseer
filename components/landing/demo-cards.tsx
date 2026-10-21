import { datasets } from "@/lib/data/datasets";
import { DemoCard } from "./demo-card";
import { HourlyLines } from "./hourly-lines";
import { StackedAreas } from "./stacked-areas";

// The two demo cards, on the landing page and the app's first screen. In the
// app, onOpen picks the dataset in place and full credits replace the short ones.
export function DemoCards({ onOpen, fullCredits = false }: { onOpen?: (id: "bikes" | "gelato") => void; fullCredits?: boolean }) {
  const { bikes, gelato } = datasets;
  return (
    <ul className="flex flex-wrap gap-3.5 md:gap-5">
      <DemoCard
        meta={bikes}
        title="Santander Cycles, London"
        description={`Bike hires across London from ${bikes.period}. See when the city commutes, and where.`}
        prompt={bikes.starters[0] ?? ""}
        drawing={<HourlyLines />}
        onOpen={onOpen && (() => onOpen("bikes"))}
        fullCredit={fullCredits}
      />
      <DemoCard
        meta={gelato}
        title={gelato.title}
        description="Daily sales from a fictional gelato chain, with a few stories hidden in the numbers. Can you find them?"
        prompt="Weekly scoops by shop, stacked"
        drawing={<StackedAreas />}
        onOpen={onOpen && (() => onOpen("gelato"))}
        fullCredit={fullCredits}
      />
    </ul>
  );
}
