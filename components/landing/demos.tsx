import { DemoCards } from "./demo-cards";
import { OwnDataPanel } from "./own-data-panel";
import { SectionIntro } from "./section-intro";
import { UploadCsvButton } from "./upload-csv-button";

export function Demos() {
  return (
    <section id="demos" aria-labelledby="demos-title" className="px-4 pt-[104px] md:px-6 md:pt-[168px]">
      <div className="mx-auto max-w-[1200px]">
        <SectionIntro id="demos-title" eyebrow="Demos" title="No data to hand? Start here." className="max-w-[640px]">
          Two ready-made datasets — one real, one delicious. Open either and start asking.
        </SectionIntro>
        <div className="mt-9 md:mt-14">
          <DemoCards />
        </div>
        <div className="mt-3.5 md:mt-5">
          <OwnDataPanel>
            <UploadCsvButton className="min-h-12 rounded-[11px] px-5 text-[15px] md:min-h-[46px]" />
          </OwnDataPanel>
        </div>
      </div>
    </section>
  );
}
