"use client";

import { useEffect, useState } from "react";
import { Mic, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const examples = [
  { text: "Mera fan chal nahi raha hai...", service: "Electrician", hi: "पंखा" },
  { text: "My bike is not starting...", service: "Vehicle Mechanic", hi: "बाइक" },
  { text: "Paani ka pipe leak ho raha hai...", service: "Plumber", hi: "पाइप" },
  { text: "AC is not cooling properly...", service: "AC / Fridge Repair", hi: "AC" },
];

type Phase = "typing" | "analyzing" | "resolved" | "erasing";

export function AIFinderDemo() {
  const [index, setIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  const current = examples[index];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (charCount < current.text.length) {
        timer = setTimeout(() => setCharCount((c) => c + 1), 38);
      } else {
        timer = setTimeout(() => setPhase("analyzing"), 500);
      }
    } else if (phase === "analyzing") {
      timer = setTimeout(() => setPhase("resolved"), 900);
    } else if (phase === "resolved") {
      timer = setTimeout(() => setPhase("erasing"), 2200);
    } else if (phase === "erasing") {
      if (charCount > 0) {
        timer = setTimeout(() => setCharCount((c) => c - 2), 12);
      } else {
        timer = setTimeout(() => {
          setIndex((i) => (i + 1) % examples.length);
          setPhase("typing");
        }, 250);
      }
    }

    return () => clearTimeout(timer);
  }, [phase, charCount, current.text.length]);

  const displayedText = current.text.slice(0, Math.max(charCount, 0));

  return (
    <div className="w-full max-w-xl rounded-2xl border border-line bg-white shadow-xl shadow-brand/5">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <Sparkles className="h-4 w-4 text-brand" />
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink/50">
          AI Service Finder
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3.5">
          <span className="min-h-[1.5rem] flex-1 font-body text-base text-ink">
            {displayedText}
            <span className="animate-type-cursor text-brand">|</span>
          </span>
          <button
            aria-label="Search by voice"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 min-h-[3.25rem]">
          {phase === "analyzing" && (
            <div className="flex items-center gap-2 px-1 text-sm font-medium text-ink/50">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
              </span>
              Matching you with the right help...
            </div>
          )}

          {(phase === "resolved" || phase === "erasing") && (
            <div
              className={cn(
                "flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-white transition-opacity duration-300",
                phase === "erasing" ? "opacity-0" : "animate-fade-slide-up opacity-100"
              )}
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-white/60">
                  Recommended Service
                </p>
                <p className="font-display text-lg font-bold">{current.service}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
