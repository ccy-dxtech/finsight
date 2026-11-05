import type { ButtonHTMLAttributes } from "react";

// 이번 step에서는 로그인에 필요한 큰 Google 버튼만 제공한다.
export function Button({ children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex h-14 items-center justify-center gap-2 rounded-pill border border-border-strong bg-canvas px-8 py-4 text-button text-ink transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:text-disabled ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
