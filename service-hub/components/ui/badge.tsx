import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Tone = "brand" | "signal" | "busy" | "alert" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand",
  signal: "bg-signal-light text-signal",
  busy: "bg-busy-light text-busy",
  alert: "bg-alert-light text-alert",
  neutral: "bg-black/5 text-ink/70",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold font-mono tracking-wide",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}

type Availability = "available" | "busy" | "offline" | "emergency";

const availabilityConfig: Record<
  Availability,
  { label: string; dot: string; tone: Tone }
> = {
  available: { label: "Available Now", dot: "bg-signal", tone: "signal" },
  busy: { label: "Busy", dot: "bg-busy", tone: "busy" },
  offline: { label: "Offline", dot: "bg-black/30", tone: "neutral" },
  emergency: { label: "Emergency Available", dot: "bg-alert", tone: "alert" },
};

export function AvailabilityBadge({ status }: { status: Availability }) {
  const cfg = availabilityConfig[status];
  return (
    <Badge tone={cfg.tone}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          cfg.dot,
          status === "available" && "animate-pulse-dot"
        )}
      />
      {cfg.label}
    </Badge>
  );
}
