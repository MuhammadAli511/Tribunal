"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar() {
  const router = useRouter();

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[#1f1e1b] bg-[#121210]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <span className="text-sm font-semibold text-[#ede9e1] tracking-tight">
            Tribunal
          </span>
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          <a
            href="#how-it-works"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#7a756c] transition-colors hover:text-[#a39e93]"
          >
            How It Works
          </a>
          <a
            href="#the-court"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#7a756c] transition-colors hover:text-[#a39e93]"
          >
            The Court
          </a>
        </div>

        <button
          onClick={() => router.push("/lobby")}
          className="rounded-lg bg-[#ede9e1] px-4 py-1.5 text-[11px] font-semibold text-[#121210] transition-opacity hover:opacity-90"
        >
          Present a Case
        </button>
      </div>
    </nav>
  );
}
