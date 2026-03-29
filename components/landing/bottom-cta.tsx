"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function BottomCta() {
  const router = useRouter();

  return (
    <section className="px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: "easeOut" as const }}
      >
        <h2 className="text-2xl font-bold text-[#ede9e1]">
          Ready to face the court?
        </h2>
        <p className="mt-2 text-[13px] text-[#7a756c]">
          Your decision deserves more than a gut feeling.
        </p>
        <button
          onClick={() => router.push("/lobby")}
          className="relative mt-6 inline-block overflow-hidden rounded-lg bg-[#ede9e1] px-6 py-2.5 text-[13px] font-semibold text-[#121210] transition-opacity hover:opacity-90"
        >
          Present Your Case
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </button>
      </motion.div>
    </section>
  );
}
