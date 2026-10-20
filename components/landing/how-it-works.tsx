import { AskDrawing } from "./ask-drawing";
import { FileDrawing } from "./file-drawing";
import { RefineDrawing } from "./refine-drawing";
import { SectionIntro } from "./section-intro";
import { StepCard } from "./step-card";

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="px-4 pt-[104px] md:px-6 md:pt-[168px]">
      <div className="mx-auto max-w-[1200px]">
        <SectionIntro id="how-title" eyebrow="How it works" title="Three steps. Zero chart menus.">
          Chartseer reads your columns, understands what you ask, and draws a chart you can trust.
        </SectionIntro>
        <ol className="mt-9 flex flex-wrap gap-3.5 md:mt-14 md:gap-5">
          <StepCard number="01" title="Bring your data" drawing={<FileDrawing />}>
            Upload a CSV, or start with a demo. It’s parsed right in your browser and never uploaded anywhere.
          </StepCard>
          <StepCard number="02" title="Say what you want to see" drawing={<AskDrawing />}>
            Ask the way you’d ask a colleague. Typos and vague questions are fine — Chartseer works out what you mean.
          </StepCard>
          <StepCard number="03" title="Refine, then take it with you" drawing={<RefineDrawing />}>
            Follow up to tweak anything, step back with undo, and export a crisp SVG or PNG when it’s right.
          </StepCard>
        </ol>
      </div>
    </section>
  );
}
