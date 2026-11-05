import type { ReactNode } from "react";

export function SettingsRow({ title, description, action, variant = "default" }: {
  title: ReactNode;
  description?: string;
  action: ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <div data-variant={variant} className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline py-4 break-keep last:border-b-0">
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="flex flex-wrap items-center gap-2 text-number-md text-ink">{title}</h2>
        {description && <p className="mt-1 text-body-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
