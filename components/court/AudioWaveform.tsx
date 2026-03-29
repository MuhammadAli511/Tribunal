"use client";

import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function AudioWaveform({
  isActive,
  barCount = 5,
  className,
}: AudioWaveformProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-center gap-[3px]",
        className,
      )}
      aria-label={isActive ? "Audio playing" : "Audio idle"}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-current transition-all duration-150",
            isActive
              ? "animate-waveform opacity-100"
              : "h-1 opacity-30",
          )}
          style={
            isActive
              ? {
                  animationDelay: `${i * 120}ms`,
                  animationDuration: `${800 + i * 100}ms`,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
