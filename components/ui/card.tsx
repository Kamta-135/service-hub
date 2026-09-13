import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-white/70 backdrop-blur-sm p-5 transition-all duration-300",
        className
      )}
      {...props}
    />
  );
}
