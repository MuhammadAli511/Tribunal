"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RulingBadge } from "@/components/shared/RulingBadge";
import type { Verdict } from "@/src/types";

interface VerdictRevealProps {
  verdict: Verdict;
  onComplete: () => void;
}

export function VerdictReveal({ verdict, onComplete }: VerdictRevealProps) {
  const [phase, setPhase] = useState<"announce" | "card" | "done">("announce");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("card"), 2000);
    const t2 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {phase === "announce" && (
          <motion.div
            key="announce"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2
              className="text-lg font-light uppercase tracking-[0.3em] text-[#ede9e1]"
              style={{ textShadow: "0 0 40px rgba(91,141,239,0.2)" }}
            >
              The Court Has Reached Its Verdict
            </h2>
          </motion.div>
        )}

        {phase === "card" && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-[380px] overflow-hidden rounded-xl border border-[#1f1e1b] bg-[#1a1917]"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between border-b border-[#1f1e1b] px-4 py-3"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                Ruling
              </span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
              >
                <RulingBadge ruling={verdict.ruling} />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="border-b border-[#1f1e1b] px-4 py-3"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                Key Factors
              </span>
              <ul className="mt-2 space-y-1">
                {verdict.keyFactors.map((f, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-start gap-2 text-[11px] leading-relaxed text-[#a39e93]"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a39e93]" />
                    {f}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="border-b border-[#1f1e1b] px-4 py-3"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                Conditions
              </span>
              <ul className="mt-2 space-y-1">
                {verdict.conditions.map((c, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.1 }}
                    className="flex items-start gap-2 text-[11px] leading-relaxed text-[#a39e93]"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#e8a830]" />
                    {c}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="px-4 py-3"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7a756c]">
                Dissent
              </span>
              <p className="mt-2 border-l-2 border-[#2a2826] pl-3 text-[11px] italic leading-relaxed text-[#7a756c]">
                &ldquo;{verdict.dissent}&rdquo;
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
