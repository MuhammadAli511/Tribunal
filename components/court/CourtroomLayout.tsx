"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CourtroomLayoutProps {
  prosecutor: ReactNode;
  defender: ReactNode;
  expert: ReactNode;
  historian: ReactNode;
  judge: ReactNode;
  className?: string;
}

/**
 * 5-panel CSS grid in courtroom formation:
 *
 *   ┌────────────┬────────────┐
 *   │ Prosecutor │  Defender  │
 *   ├────────────┼────────────┤
 *   │   Expert   │ Historian  │
 *   ├────────────┴────────────┤
 *   │         Judge           │
 *   └────────────────────────-┘
 */
export function CourtroomLayout({
  prosecutor,
  defender,
  expert,
  historian,
  judge,
  className,
}: CourtroomLayoutProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 grid-rows-[1fr_1fr_auto] gap-3",
        className,
      )}
    >
      {/* Top row */}
      <div className="col-start-1 row-start-1">{prosecutor}</div>
      <div className="col-start-2 row-start-1">{defender}</div>

      {/* Middle row */}
      <div className="col-start-1 row-start-2">{expert}</div>
      <div className="col-start-2 row-start-2">{historian}</div>

      {/* Bottom row — Judge spans full width */}
      <div className="col-span-2 row-start-3">{judge}</div>
    </div>
  );
}
