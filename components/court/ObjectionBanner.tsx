"use client";

import { useEffect, useState } from "react";
import { agentColor } from "@/components/shared/AgentAvatar";
import type { AgentRole } from "@/src/types";

interface ObjectionBannerProps {
  role: AgentRole | null;
  triggerId: string | null;
}

export function ObjectionBanner({ role, triggerId }: ObjectionBannerProps) {
  const [activeObjection, setActiveObjection] = useState<{
    role: AgentRole;
    id: string;
  } | null>(null);

  useEffect(() => {
    if (!role || !triggerId) return;
    setActiveObjection({ role, id: triggerId });
    const timer = setTimeout(() => setActiveObjection(null), 2000);
    return () => clearTimeout(timer);
  }, [role, triggerId]);

  if (!activeObjection) return null;

  const color = agentColor(activeObjection.role);
  const isLeft = activeObjection.role === "prosecutor" || activeObjection.role === "domain-expert";

  return (
    <div
      key={activeObjection.id}
      className={`pointer-events-none absolute top-1/2 z-40 -translate-y-1/2 ${
        isLeft ? "left-0 animate-objection-left" : "right-0 animate-objection-right"
      }`}
    >
      <div
        className="flex items-center px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{
          color,
          background: `${color}14`,
          border: `1px solid ${color}33`,
          borderRadius: isLeft ? "0 6px 6px 0" : "6px 0 0 6px",
        }}
      >
        Objection
      </div>
    </div>
  );
}
