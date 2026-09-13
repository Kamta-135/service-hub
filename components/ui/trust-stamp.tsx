import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * TrustStamp — the signature visual element of Service.Hub.
 * Evokes an official verification seal (like a notarized/ration-card stamp),
 * reused across provider cards, hero badges, and trust sections.
 */
export function TrustStamp({
  label = "Verified",
  size = "md",
  animate = true,
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}) {
  const dims = { sm: 40, md: 56, lg: 88 }[size];
  const tickCount = 16;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        animate && "animate-stamp-in",
        className
      )}
      style={{ width: dims, height: dims, transform: "rotate(-6deg)" }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" width={dims} height={dims}>
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="#FF7A1A"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#F7F7F5"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        {Array.from({ length: tickCount }).map((_, i) => {
          const angle = (i / tickCount) * Math.PI * 2;
          const x1 = 50 + Math.cos(angle) * 44;
          const y1 = 50 + Math.sin(angle) * 44;
          const x2 = 50 + Math.cos(angle) * 40;
          const y2 = 50 + Math.sin(angle) * 40;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#1A1A1A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <Check
        className="absolute text-white"
        style={{ width: dims * 0.4, height: dims * 0.4 }}
        strokeWidth={3}
      />
    </div>
  );
}
