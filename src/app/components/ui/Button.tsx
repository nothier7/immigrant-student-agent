"use client";

import * as React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export function buttonCn({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size }) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-2xl transition-colors focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  const variants: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary600 active:bg-primary700",
    secondary: "bg-card text-heading border border-[color:rgb(var(--glass-border)/0.18)] hover:bg-bg/60",
    outline:
      "bg-transparent text-heading border border-[color:rgb(var(--glass-border)/0.22)] hover:bg-bg/60",
    ghost: "bg-transparent text-heading hover:bg-bg/60",
  };

  return [base, sizes[size], variants[variant]].join(" ");
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => (
    <button ref={ref} className={[buttonCn({ variant, size }), className].join(" ")} {...props} />
  )
);

Button.displayName = "Button";
