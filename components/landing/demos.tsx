import { datasets } from "@/lib/data/datasets";
import { DemoCard } from "./demo-card";
import { HourlyLines } from "./hourly-lines";
import { Icon } from "./icon";
import { SectionIntro } from "./section-intro";
import { StackedAreas } from "./stacked-areas";
import { UploadCsvButton } from "./upload-csv-button";

export function Demos() {
  const { bikes, gelato } = datasets;
  return (
    <section id="demos" aria-labelledby="demos-title" className="px-4 pt-[104px] md:px-6 md:pt-[168px]">
      <div className="mx-auto max-w-[1200px]">
        <SectionIntro id="demos-title" eyebrow="Demos" title="No data to hand? Start here." className="max-w-[640px]">
          Two ready-made datasets — one real, one delicious. Open either and start asking.
        </SectionIntro>
        <ul className="mt-9 flex flex-wrap gap-3.5 md:mt-14 md:gap-5">
          <DemoCard
            meta={bikes}
            title="Santander Cycles, London"
            description={`Bike hires across London from ${bikes.period}. See when the city commutes, and where.`}
            prompt={bikes.starters[0] ?? ""}
            drawing={<HourlyLines />}
          />
          <DemoCard
            meta={gelato}
            title={gelato.title}
            description="Daily sales from a fictional gelato chain, with a few stories hidden in the numbers. Can you find them?"
            prompt="Weekly scoops by shop, stacked"
            drawing={<StackedAreas />}
          />
        </ul>
        <div className="mt-3.5 flex flex-col gap-3.5 rounded-[18px] border-[1.5px] border-dashed border-border-strong bg-card px-5 py-[22px] md:mt-5 md:flex-row md:flex-wrap md:items-center md:gap-5 md:rounded-[20px] md:px-7 md:py-6">
          <div className="flex min-w-0 grow items-center md:basis-[348px] gap-3.5 md:gap-5">
            <span className="inline-flex size-11 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent md:size-12">
              <Icon name="upload" size={22} />
            </span>
            <div>
              <p className="text-[17px] font-semibold tracking-[-0.015em] md:text-lg">Got your own data?</p>
              <p className="mt-0.5 text-sm text-secondary md:text-[15px]">
                <span className="md:hidden">Any CSV up to 5 MB. UK and US dates and currencies just work.</span>
                <span className="hidden md:inline">
                  Drop a CSV anywhere on the page, up to 5 MB. UK and US dates and currencies just work.
                </span>
              </p>
            </div>
          </div>
          <UploadCsvButton className="min-h-12 rounded-[11px] px-5 text-[15px] md:min-h-[46px]" />
        </div>
      </div>
    </section>
  );
}
