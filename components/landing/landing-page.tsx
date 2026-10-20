import { ClosingCta } from "./closing-cta";
import { Demos } from "./demos";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { TopBar } from "./top-bar";
import { UnderTheHood } from "./under-the-hood";
import { UploadProvider } from "./upload-provider";

// The landing page at / (D-068). Server-rendered; the only client code is the
// upload wrapper and buttons, and the phone menu.
export function LandingPage() {
  return (
    <UploadProvider>
      <TopBar />
      <main className="overflow-x-hidden">
        <Hero />
        <HowItWorks />
        <Demos />
        <UnderTheHood />
        <ClosingCta />
      </main>
      <Footer />
    </UploadProvider>
  );
}
