import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "emergency";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-light active:bg-brand-dark shadow-sm",
  secondary:
    "bg-brand text-ink hover:bg-brand-light active:bg-brand-dark shadow-sm",
  outline:
    "border-2 border-brand text-brand bg-transparent hover:bg-brand hover:text-white",
  ghost: "bg-transparent text-brand hover:bg-brand/10",
  emergency:
    "bg-alert text-white hover:bg-alert/90 shadow-md shadow-alert/20",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-12 px-5 text-base rounded-xl gap-2",
  lg: "h-14 px-7 text-lg rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold font-body transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
