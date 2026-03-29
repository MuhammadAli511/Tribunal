"use client";

import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  isRecording: boolean;
  onPress: () => void;
  onRelease: () => void;
  size?: "default" | "lg";
  className?: string;
}

export function MicButton({
  isRecording,
  onPress,
  onRelease,
  size = "default",
  className,
}: MicButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 transition-all duration-200 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a756c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121210]",
        size === "lg"
          ? "h-[52px] w-[52px] [&>svg]:size-5"
          : "h-14 w-14 [&>svg]:size-6",
        isRecording
          ? "border-[#e35d5d] bg-[#e35d5d]/20 text-[#e35d5d] scale-105"
          : "border-[#2a2826] bg-[#1a1917] text-[#a39e93] hover:border-[#7a756c] hover:text-[#ede9e1]",
        className,
      )}
    >
      {isRecording && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-[#e35d5d]/15" />
          <span className="absolute inset-[-6px] rounded-full border border-[#e35d5d]/30 animate-ring-pulse" />
        </>
      )}
      <Mic className="relative z-10" />
    </button>
  );
}
