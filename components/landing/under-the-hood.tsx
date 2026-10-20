import { SectionIntro } from "./section-intro";
import { SpecCard } from "./spec-card";
import { TrustPoint } from "./trust-point";

export function UnderTheHood() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="px-4 pt-[104px] md:px-6 md:pt-[168px]">
      <div className="mx-auto max-w-[1200px]">
        <SectionIntro id="trust-title" eyebrow="Under the hood" title="Built to be trusted." className="max-w-[720px]">
          The AI decides what a chart should say. Chartseer decides how it’s drawn, and checks every step in between.
        </SectionIntro>
        <div className="mt-9 flex flex-wrap items-stretch gap-10 md:mt-14 md:gap-12">
          <SpecCard />
          <ul className="flex min-w-0 grow basis-[440px] flex-col content-center gap-8 md:flex-row md:flex-wrap md:gap-x-8 md:gap-y-10">
            <TrustPoint icon="lock" title="Private by design">
              Your file never leaves your device. The AI only sees column names and a few sample rows.
            </TrustPoint>
            <TrustPoint icon="shield" title="No generated code">
              The AI fills in a strict chart spec. It’s checked against your columns before anything is drawn.
            </TrustPoint>
            <TrustPoint icon="person" title="Accessible by default">
              Every chart comes with a text description, a table view and full keyboard support.
            </TrustPoint>
            <TrustPoint icon="download" title="Yours to keep">
              Download crisp SVG or PNG, or copy the spec behind any chart.
            </TrustPoint>
          </ul>
        </div>
      </div>
    </section>
  );
}
