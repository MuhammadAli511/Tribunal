"use client";

import { motion } from "motion/react";

interface CaseFileAnimationProps {
  caseId: string;
  briefText: string;
  onComplete: () => void;
}

export function CaseFileAnimation({ caseId, briefText, onComplete }: CaseFileAnimationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121210]/80 backdrop-blur-sm">
      <motion.div
        className="w-[320px] overflow-hidden rounded-lg border border-[#a39e9340] bg-[#1a1917]"
        initial={{ scale: 1, opacity: 1 }}
        animate={{
          scale: [1, 1, 0.6],
          opacity: [1, 1, 0],
          y: [0, 0, -200],
          x: [0, 0, 200],
        }}
        transition={{
          duration: 1.8,
          times: [0, 0.55, 1],
          ease: "easeInOut",
        }}
        onAnimationComplete={onComplete}
      >
        <div className="border-b border-[#2a2826] px-4 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#52504a]">
            Case File
          </span>
        </div>

        <div className="px-4 py-3">
          <p className="line-clamp-3 font-mono text-[10px] leading-relaxed text-[#7a756c]">
            {briefText}
          </p>
        </div>

        <motion.div
          className="mx-4 h-px bg-[#a39e93]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        />

        <div className="flex items-center justify-center py-3">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 20 }}
            className="rounded border border-[#e35d5d40] px-3 py-1"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#e35d5d]">
              #{caseId.slice(0, 6)}
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
