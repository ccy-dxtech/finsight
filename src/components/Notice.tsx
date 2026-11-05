import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

type NoticeProps = {
  variant?: "default" | "success" | "error";
  children: ReactNode;
};

const variants = {
  default: { classes: "bg-surface-strong text-body", iconClass: "text-body", Icon: Info },
  success: { classes: "bg-primary-soft text-ink", iconClass: "text-primary", Icon: CircleCheck },
  error: { classes: "bg-danger-soft text-ink", iconClass: "text-danger", Icon: CircleAlert },
};

export function Notice({ variant = "default", children }: NoticeProps) {
  const { classes, iconClass, Icon } = variants[variant];

  return (
    <div role={variant === "error" ? "alert" : "status"} className={`flex items-start gap-3 break-keep rounded-md px-4 py-3 text-body-sm ${classes}`}>
      <Icon size={20} strokeWidth={1.5} aria-hidden="true" className={`mt-px shrink-0 ${iconClass}`} />
      <div className="min-w-0 wrap-anywhere [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </div>
  );
}
