"use client";

import { motion } from "motion/react";

const STEPS = [
  {
    number: "1",
    title: "Speak your decision",
    description:
      "Talk to the Judge. No typing — just say what you're considering. The AI asks follow-ups to understand your situation.",
  },
  {
    number: "2",
    title: "The court debates",
    description:
      "Five agents argue in real-time with voice. Watch the prosecution and defense clash while experts provide context.",
  },
  {
    number: "3",
    title: "Receive your verdict",
    description:
      "The Judge delivers a structured ruling — key factors, conditions, and the dissenting opinion. Clarity, not confusion.",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#7a756c]">
          Process
        </span>
        <h2 className="mt-1.5 text-xl font-bold text-[#ede9e1]">
          Three steps to clarity.
        </h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-10 flex max-w-md flex-col"
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.number} variants={item} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2a2826] font-mono text-[11px] font-semibold text-[#a39e93]">
                  {step.number}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="my-2 w-px flex-1 bg-[#1f1e1b]" />
                )}
              </div>
              <div className={i < STEPS.length - 1 ? "pb-7" : ""}>
                <p className="text-[14px] font-semibold text-[#ede9e1]">
                  {step.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#7a756c]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
