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
        "grid grid-cols-2 grid-rows-[1fr_1fr_auto] gap-2",
        className,
      )}
    >
      <div className="col-start-1 row-start-1">{prosecutor}</div>
      <div className="col-start-2 row-start-1">{defender}</div>
      <div className="col-start-1 row-start-2">{expert}</div>
      <div className="col-start-2 row-start-2">{historian}</div>
      <div className="col-span-2 row-start-3">{judge}</div>
    </div>
  );
}
