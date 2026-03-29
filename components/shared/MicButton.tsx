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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        size === "lg"
          ? "h-24 w-24 [&>svg]:size-10"
          : "h-14 w-14 [&>svg]:size-6",
        isRecording
          ? "border-red-500 bg-red-500/20 text-red-500 scale-110"
          : "border-muted-foreground/30 bg-muted/50 text-muted-foreground hover:border-foreground/50 hover:text-foreground",
        className,
      )}
    >
      {/* Pulsing ring when recording */}
      {isRecording && (
        <>
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
          <span className="absolute inset-[-4px] animate-pulse rounded-full border-2 border-red-500/40" />
        </>
      )}
      <Mic className="relative z-10" />
    </button>
  );
}
