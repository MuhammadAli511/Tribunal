"use client";

import { cn } from "@/lib/utils";
import type { AgentRole } from "@/src/types";

interface SentimentPoint {
  role: AgentRole;
  score: number;
}

const ROLE_COLORS: Record<AgentRole, string> = {
  judge: "#5b8def",
  prosecutor: "#e35d5d",
  defender: "#4ead6b",
  "domain-expert": "#e8a830",
  historian: "#b06ed4",
};

const ROLE_SHORT: Record<AgentRole, string> = {
  judge: "J",
  prosecutor: "P",
  defender: "D",
  "domain-expert": "E",
  historian: "H",
};

interface PulseTimelineProps {
  scores: SentimentPoint[];
  className?: string;
}

export function PulseTimeline({ scores, className }: PulseTimelineProps) {
  if (scores.length === 0) return null;

  const cumulative: number[] = [];
  let running = 0;
  for (const s of scores) {
    running += s.score;
    cumulative.push(running);
  }

  const maxAbs = Math.max(1, ...cumulative.map(Math.abs));
  const width = 100;
  const height = 40;
  const padding = 4;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const points = cumulative.map((val, i) => ({
    x: padding + (scores.length === 1 ? usableW / 2 : (i / (scores.length - 1)) * usableW),
    y: padding + ((1 - val / maxAbs) / 2) * usableH,
    role: scores[i].role,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className={cn("rounded-[10px] border border-[#1f1e1b] bg-[#1a1917] p-2", className)}>
      <span className="mb-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-[#52504a]">
        Sentiment Pulse
      </span>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="#2a2826"
          strokeWidth="0.5"
        />
        <path d={linePath} fill="none" stroke="#52504a" strokeWidth="0.8" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2" fill={ROLE_COLORS[p.role]} />
            <text
              x={p.x}
              y={p.y - 3.5}
              textAnchor="middle"
              fill={ROLE_COLORS[p.role]}
              fontSize="3.5"
              fontFamily="monospace"
            >
              {ROLE_SHORT[p.role]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
