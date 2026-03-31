"use client";

import { cn } from "@/lib/utils";
import { TEMPLATES } from "@/lib/templates";
import type { TemplateId } from "@/src/types";
import {
  UserPlus,
  Rocket,
  TrendingUp,
  Handshake,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  Rocket,
  TrendingUp,
  Handshake,
  RefreshCw,
  MessageSquare,
};

interface TemplateGridProps {
  selected: TemplateId | null;
  onSelect: (id: TemplateId) => void;
  className?: string;
}

export function TemplateGrid({ selected, onSelect, className }: TemplateGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {TEMPLATES.map((t) => {
        const Icon = ICON_MAP[t.icon] ?? MessageSquare;
        const isSelected = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-[10px] border px-3 py-2.5 text-left transition-all",
              isSelected
                ? "border-[#5b8def]/40 bg-[#5b8def]/8"
                : "border-[#1f1e1b] bg-[#1a1917] hover:border-[#2a2826]",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isSelected ? "text-[#5b8def]" : "text-[#52504a]",
              )}
            />
            <span
              className={cn(
                "text-[11px] font-medium",
                isSelected ? "text-[#ede9e1]" : "text-[#a39e93]",
              )}
            >
              {t.name}
            </span>
            <span className="text-[9px] leading-tight text-[#52504a]">
              {t.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
