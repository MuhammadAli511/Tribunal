"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Gavel } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background">
          <Gavel className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Tribunal</h1>
        <p className="max-w-sm text-muted-foreground">
          An AI-powered courtroom that stress-tests your decisions. Five agents
          debate, cross-examine, and deliver a verdict.
        </p>
      </div>

      <div className="flex gap-3">
        <Button size="lg" onClick={() => router.push("/lobby")}>
          Present a Case
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => router.push("/history")}
        >
          Past Cases
        </Button>
      </div>
    </div>
  );
}
