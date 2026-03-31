"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CourtroomLayoutProps {
  prosecutor: ReactNode;
  defender: ReactNode;
  expert: ReactNode;
  historian: ReactNode;
  judge: ReactNode;
  prosecutionHeat?: number;
  defenseHeat?: number;
  className?: string;
}

export function CourtroomLayout({
  prosecutor,
  defender,
  expert,
  historian,
  judge,
  prosecutionHeat = 0.04,
  defenseHeat = 0.04,
  className,
}: CourtroomLayoutProps) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 55%, black 0%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 55%, black 0%, transparent 80%)",
          }}
        />
        <div
          className="absolute bottom-[-15%] left-1/2 h-[60%] w-[70%] -translate-x-1/2"
          style={{
            background: "radial-gradient(ellipse at center, rgba(91,141,239,0.035) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Heat map glows */}
      <div
        className="pointer-events-none absolute left-[3%] top-[5%] h-[350px] w-[350px] rounded-full transition-opacity duration-[1500ms]"
        style={{
          background: "radial-gradient(circle, rgba(227,93,93,0.08) 0%, rgba(227,93,93,0.02) 40%, transparent 70%)",
          opacity: Math.min(1, prosecutionHeat * 12),
        }}
      />
      <div
        className="pointer-events-none absolute right-[3%] top-[5%] h-[320px] w-[320px] rounded-full transition-opacity duration-[1500ms]"
        style={{
          background: "radial-gradient(circle, rgba(78,173,107,0.08) 0%, rgba(78,173,107,0.02) 40%, transparent 70%)",
          opacity: Math.min(1, defenseHeat * 12),
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[-2%] left-1/2 h-[250px] w-[400px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(91,141,239,0.04) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-[1%] top-[42%] h-[200px] w-[200px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232,168,48,0.035) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-[1%] top-[42%] h-[200px] w-[200px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(176,110,212,0.03) 0%, transparent 65%)",
        }}
      />

      {/* Agent panels */}
      <div className="absolute left-[6%] top-[10%] z-10 w-[230px]">{prosecutor}</div>
      <div className="absolute right-[6%] top-[10%] z-10 w-[230px]">{defender}</div>
      <div className="absolute left-[3%] top-1/2 z-10 w-[230px] -translate-y-1/2">{expert}</div>
      <div className="absolute right-[3%] top-1/2 z-10 w-[230px] -translate-y-1/2">{historian}</div>
      <div className="absolute bottom-[5%] left-1/2 z-10 w-[320px] -translate-x-1/2">{judge}</div>
    </div>
  );
}
