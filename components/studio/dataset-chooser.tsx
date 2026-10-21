import { DemoCards } from "@/components/landing/demo-cards";
import { OwnDataPanel } from "@/components/landing/own-data-panel";
import type { DatasetId } from "./dataset-picker";
import { PRIVACY_NOTE, UploadButton } from "./upload-button";

// The first screen: a demo dataset or the user's own file (D-045). The cards
// and the upload strip are the landing page's own (D-069).
export function DatasetChooser({ onPick, onFile }: { onPick: (id: DatasetId) => void; onFile: (file: File) => void }) {
  return (
    <section aria-labelledby="chooser-title" className="mx-auto flex w-full max-w-[1200px] flex-col gap-3.5 py-8 md:gap-5 md:py-12">
      <div className="mb-2 flex flex-col gap-2 md:mb-4">
        <h2 id="chooser-title" className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] md:text-[40px]">
          Choose some data to chart
        </h2>
        <p className="text-[15px] leading-[1.55] text-secondary md:text-[17px]">
          Try a demo dataset, or upload a CSV of your own. Then describe the chart you want.
        </p>
      </div>
      <DemoCards onOpen={onPick} fullCredits />
      <OwnDataPanel note={PRIVACY_NOTE}>
        <UploadButton onFile={onFile} primary />
      </OwnDataPanel>
    </section>
  );
}
