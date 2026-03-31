"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { CourtPanel } from "@/components/landing/court-panel";
import { HowItWorks } from "@/components/landing/how-it-works";
import { BottomCta } from "@/components/landing/bottom-cta";
import { Footer } from "@/components/landing/footer";
import { useAtmosphere } from "@/components/atmosphere/AtmosphereProvider";

function Divider() {
  return (
    <div className="mx-6">
      <div className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-[#2a2826] to-transparent" />
    </div>
  );
}

export default function HomePage() {
  const { setMood } = useAtmosphere();
  const [scrollY, setScrollY] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMood("landing");
  }, [setMood]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={scrollRef} className="min-h-svh">
      <Navbar />
      <Hero scrollY={scrollY} />
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
