import { CtaBars } from "./cta-bars";
import { UploadCsvButton } from "./upload-csv-button";

// A dark panel in both themes; in dark mode it lifts a step off the page.
export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pt-[104px] md:px-6 md:pt-[168px]">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[26px] bg-ink-panel px-[22px] pt-16 pb-[120px] text-center text-white md:rounded-[32px] md:px-8 md:pt-28 md:pb-[168px]">
        <CtaBars className="h-[92px] md:h-[132px]" />
        <div className="relative">
          <h2
            id="cta-title"
            className="mx-auto max-w-[760px] text-[40px] leading-[1.04] font-semibold tracking-[-0.04em] md:text-[clamp(38px,5.2vw,68px)] md:leading-[1.03]"
          >
            Your data has a story.{" "}
            <span className="font-serif-italic font-medium tracking-[-0.02em] italic text-accent-on-dark">Just ask.</span>
          </h2>
          <p className="mx-auto mt-[18px] max-w-[520px] text-[17px] leading-[1.55] text-on-dark-muted md:mt-6 md:text-[19px]">
            Upload a CSV or open a demo. Your first chart is one sentence away.
          </p>
          <div className="mt-8 flex flex-col gap-2.5 md:mt-10 md:flex-row md:flex-wrap md:justify-center md:gap-3">
            <UploadCsvButton variant="inverse" className="min-h-[52px] rounded-xl px-6 text-base" />
            <a
              href="#demos"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/22 px-6 text-base font-medium text-white"
            >
              Try a demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
