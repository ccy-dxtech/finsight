import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "text" | "google" | "danger";
  size?: "md" | "lg";
  disabled?: boolean;
} & (
  | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
);

const variants = {
  primary: "border-transparent bg-primary text-on-primary enabled:active:bg-primary-active [&[href]]:active:bg-primary-active disabled:bg-primary-disabled aria-disabled:bg-primary-disabled",
  secondary: "border-transparent bg-surface-strong text-ink disabled:text-disabled aria-disabled:text-disabled",
  text: "border-transparent bg-transparent text-primary disabled:text-disabled aria-disabled:text-disabled",
  google: "border-border-strong bg-canvas text-ink disabled:text-disabled aria-disabled:text-disabled",
  danger: "border-danger bg-canvas text-danger disabled:border-disabled disabled:text-disabled aria-disabled:border-disabled aria-disabled:text-disabled",
};

export function Button({ children, className = "", variant = "google", size = "lg", disabled = false, ...props }: ButtonProps) {
  const sizing = variant === "text"
    ? "h-auto px-0 py-3 text-button"
    : size === "lg" ? "h-14 px-8 py-4 text-title-sm" : "h-11 px-5 py-3 text-button";
  const classes = `inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill border font-sans transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed aria-disabled:cursor-not-allowed ${variants[variant]} ${sizing} ${className}`;

  if (props.href !== undefined) {
    return (
      <a
        {...props}
        href={disabled ? undefined : props.href}
        role={disabled ? "link" : props.role}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : props.tabIndex}
        onClick={disabled ? undefined : props.onClick}
        className={classes}
      >
        {children}
      </a>
    );
  }

  const { type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
