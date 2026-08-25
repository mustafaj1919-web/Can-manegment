import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  className?: string;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] hover:shadow-[0_10px_32px_-8px_rgba(37,99,235,0.75)]",
  secondary: "bg-fg text-bg hover:opacity-90",
  outline: "border border-border-strong text-fg hover:border-primary hover:text-primary bg-transparent",
  ghost: "text-fg hover:bg-bg-muted",
  glass: "glass text-fg hover:border-primary/50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-12 px-6 text-[0.95rem] gap-2",
  lg: "h-14 px-8 text-base gap-2.5",
};

const base =
  "inline-flex items-center justify-center rounded-full font-semibold tracking-tight transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "end",
  className,
  children,
  ...props
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon && iconPosition === "start" && icon}
      {children}
      {icon && iconPosition === "end" && icon}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "end",
  className,
  children,
  target,
}: BaseProps & { href: string; target?: string }) {
  return (
    <Link
      href={href}
      target={target}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {icon && iconPosition === "start" && icon}
      {children}
      {icon && iconPosition === "end" && icon}
    </Link>
  );
}
