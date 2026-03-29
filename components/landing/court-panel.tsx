"use client";

import { motion } from "motion/react";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import type { AgentRole } from "@/src/types";

const AGENTS: { role: AgentRole; name: string; description: string }[] = [
  {
    role: "judge",
    name: "The Judge",
    description: "Presides over the court. Asks questions. Delivers the final verdict.",
  },
  {
    role: "prosecutor",
    name: "Prosecutor",
    description: "Argues against your decision. Finds the weaknesses and risks.",
  },
  {
    role: "defender",
    name: "Defender",
    description: "Argues for your decision. Highlights the strengths and upside.",
  },
  {
    role: "domain-expert",
    name: "Domain Expert",
    description: "Provides technical analysis and domain-specific insight.",
  },
  {
    role: "historian",
    name: "Historian",
    description: "Draws from historical patterns and precedent across past cases.",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function CourtPanel() {
  return (
    <section id="the-court" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#7a756c]">
          The Court
        </span>
        <h2 className="mt-1.5 text-xl font-bold text-[#ede9e1]">
          Meet the panel.
        </h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-8 flex gap-3 overflow-x-auto pb-2"
        >
          {AGENTS.map((agent) => (
            <motion.div
              key={agent.role}
              variants={item}
              className="min-w-[180px] shrink-0 rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-4"
            >
              <AgentAvatar role={agent.role} size="md" className="mb-3 h-9 w-9 text-lg" />
              <p className="text-[13px] font-semibold text-[#ede9e1]">
                {agent.name}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#7a756c]">
                {agent.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
