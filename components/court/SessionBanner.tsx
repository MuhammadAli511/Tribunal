"use client";

import { useEffect, useState } from "react";

interface SessionBannerProps {
  caseId: string;
}

export function SessionBanner({ caseId }: SessionBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `tribunal-session-banner-${caseId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3600);
    return () => clearTimeout(timer);
  }, [caseId]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
      style={{
        animation: "banner-in 0.8s cubic-bezier(0.16,1,0.3,1) forwards, banner-out 0.6s ease-in 3s forwards",
      }}
    >
      <div className="text-center">
        <h1
          className="text-[22px] font-light uppercase tracking-[0.35em] text-[#ede9e1]"
          style={{ textShadow: "0 0 60px rgba(91,141,239,0.15)" }}
        >
          The Court Is Now In Session
        </h1>
        <div
          className="mx-auto mt-3.5"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(91,141,239,0.3), transparent)",
            animation: "rule-expand 1s cubic-bezier(0.16,1,0.3,1) 0.4s forwards",
            width: 0,
          }}
        />
        <p
          className="mt-3 text-[9px] uppercase tracking-[0.2em] text-[#52504a]"
          style={{ opacity: 0, animation: "fade-in 0.5s ease 1s forwards" }}
        >
          All agents present &middot; Proceedings may begin
        </p>
      </div>
    </div>
  );
}
