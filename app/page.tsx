import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { CourtPanel } from "@/components/landing/court-panel";
import { HowItWorks } from "@/components/landing/how-it-works";
import { BottomCta } from "@/components/landing/bottom-cta";
import { Footer } from "@/components/landing/footer";

function Divider() {
  return (
    <div className="mx-6">
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-[#2a2826] to-transparent" />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-svh bg-[#121210]">
      <Navbar />
      <Hero />
      <Divider />
      <CourtPanel />
      <Divider />
      <HowItWorks />
      <Divider />
      <BottomCta />
      <Footer />
    </div>
  );
}
