"use client";

import { useEffect, useRef, useState } from "react";

interface DictationDisplayProps {
  text: string;
  isActive: boolean;
  className?: string;
}

export function DictationDisplay({ text, isActive, className }: DictationDisplayProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (text.length <= prevTextRef.current.length) {
      setDisplayedLength(text.length);
      prevTextRef.current = text;
      return;
    }

    const newChars = text.length - prevTextRef.current.length;
    prevTextRef.current = text;
    let revealed = 0;

    const interval = setInterval(() => {
      revealed++;
      setDisplayedLength((prev) => prev + 1);
      if (revealed >= newChars) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  if (!text && !isActive) return null;

  const shown = text.slice(0, displayedLength);

  return (
    <div className={className}>
      <p className="font-mono text-[12px] leading-relaxed text-[#a39e93]">
        {shown}
        {isActive && (
          <span
            className="ml-0.5 inline-block h-[14px] w-[1px] translate-y-[2px] bg-[#5b8def] animate-cursor-blink"
          />
        )}
      </p>
    </div>
  );
}
