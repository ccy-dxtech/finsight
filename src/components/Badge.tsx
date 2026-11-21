import type { ReactNode } from "react";
import { Icon } from "./Icon";

type BadgeProps = {
  variant?: "default" | "pro" | "lock";
  children: ReactNode;
};

const variants = {
  default: "bg-surface-strong text-body",
  pro: "bg-primary-soft text-primary",
  lock: "bg-surface-strong text-muted",
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-pill px-2.5 text-label ${variants[variant]}`}>
      {variant === "lock" && <Icon name="lock" size={20} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-body" />}
      {children}
    </span>
  );
}
