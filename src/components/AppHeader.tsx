"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Plan } from "@/types";
import { Badge } from "./Badge";

export function AppHeader({ plan, currentPath }: { plan: Plan; currentPath?: string }) {
  const pathname = usePathname();
  const path = currentPath ?? pathname;
  const active = path?.startsWith("/dashboard/reports/") ? "/dashboard" : path;

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-x-8 gap-y-3 border-b border-hairline bg-canvas px-8 py-3 text-ink">
      <Link href="/dashboard" className="text-title-md font-extrabold">Fin<b className="text-primary">Sight</b></Link>
      <nav aria-label="대시보드" className="order-last w-full sm:order-none sm:w-auto">
        <ul className="flex items-center gap-2">
          {[["/dashboard", "홈"], ["/dashboard/trends", "월별 추이"], ["/dashboard/settings", "설정"]].map(([href, label]) => (
            <li key={href}>
              <Link href={href} aria-current={active === href ? "page" : undefined} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-nav-link text-body transition-colors duration-150 aria-[current=page]:bg-surface-strong aria-[current=page]:font-semibold aria-[current=page]:text-ink">
                {label}{href === "/dashboard/trends" && plan === "free" && <Badge variant="lock">프로</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="ml-auto"><Badge variant={plan === "pro" ? "pro" : "default"}>{plan === "pro" ? "프로" : "무료"}</Badge></div>
    </header>
  );
}
