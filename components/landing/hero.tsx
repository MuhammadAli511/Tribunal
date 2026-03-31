"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AgentAvatar } from "@/components/shared/AgentAvatar";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function Hero({ scrollY = 0 }: { scrollY?: number }) {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-16">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-center md:gap-8">
        {/* Left: Copy */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2a2826] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ead6b]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#a39e93]">
                5 AI Agents. 1 Verdict.
              </span>
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-4xl font-bold tracking-tight text-[#ede9e1] sm:text-5xl"
          >
            Stress-test
            <br />
            your decisions.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-4 max-w-md text-sm leading-relaxed text-[#7a756c]"
          >
            Present your case to an AI courtroom. A prosecutor attacks it, a
            defender supports it, experts weigh in — and a judge delivers the
            verdict.
          </motion.p>

          <motion.div variants={item} className="mt-7 flex gap-3">
            <button
              onClick={() => router.push("/lobby")}
              className="rounded-lg bg-[#ede9e1] px-5 py-2.5 text-[12px] font-semibold text-[#121210] transition-opacity hover:opacity-90"
            >
              Present a Case
            </button>
            <button
              onClick={() => router.push("/history")}
              className="rounded-lg border border-[#2a2826] px-5 py-2.5 text-[12px] text-[#7a756c] transition-colors hover:border-[#7a756c] hover:text-[#a39e93]"
            >
              View Past Cases
            </button>
          </motion.div>
        </motion.div>

        {/* Right: Court circle visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" as const }}
          className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center will-change-transform"
          style={{ transform: `translateY(${scrollY * -0.15}px)` }}
        >
          {/* Glow */}
          <div className="absolute h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(237,233,225,0.03),transparent_70%)] animate-glow-pulse" />
          {/* Outer ring */}
          <div className="absolute h-[220px] w-[220px] rounded-full border border-[#1f1e1b]" />
          {/* Inner ring */}
          <div className="absolute h-[160px] w-[160px] rounded-full border border-dashed border-[#1f1e1b]" />

          {/* Connecting lines */}
          <svg
            className="absolute h-[220px] w-[220px] opacity-[0.12]"
            viewBox="0 0 220 220"
          >
            <line x1="110" y1="28" x2="110" y2="110" stroke="#ede9e1" strokeWidth="0.5" />
            <line x1="110" y1="192" x2="110" y2="110" stroke="#ede9e1" strokeWidth="0.5" />
            <line x1="28" y1="110" x2="110" y2="110" stroke="#ede9e1" strokeWidth="0.5" />
            <line x1="192" y1="110" x2="110" y2="110" stroke="#ede9e1" strokeWidth="0.5" />
          </svg>

          {/* Judge at center */}
          <AgentAvatar role="judge" size="lg" className="z-10 shadow-[0_0_24px_rgba(91,141,239,0.15)]" />

          {/* Agents on ring */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <AgentAvatar role="prosecutor" size="md" className="h-9 w-9 text-lg" />
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <AgentAvatar role="defender" size="md" className="h-9 w-9 text-lg" />
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <AgentAvatar role="domain-expert" size="md" className="h-9 w-9 text-lg" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <AgentAvatar role="historian" size="md" className="h-9 w-9 text-lg" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
