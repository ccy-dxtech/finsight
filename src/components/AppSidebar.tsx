"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, House, Settings, type LucideIcon } from "lucide-react";
import type { Plan } from "@/types";
import { Badge } from "./Badge";

const MENU: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "홈", Icon: House },
  { href: "/dashboard/trends", label: "월별 추이", Icon: ChartNoAxesColumn },
  { href: "/dashboard/settings", label: "설정", Icon: Settings },
];

// 1024px(lg) 이상은 왼쪽 고정 사이드바, 그보다 좁으면 같은 마크업이 상단 바가 된다(ADR-017).
// 플랜 카드는 지금 플랜 배지만 보여준다. 한도 설명과 "프로 구독하기"는 홈 플랜 카드와
// 설정의 플랜 행이 맡아서, 같은 내용을 한 화면에 두 번 두지 않는다.
export function AppSidebar({ plan, currentPath }: { plan: Plan; currentPath?: string }) {
  const pathname = usePathname();
  const path = currentPath ?? pathname;
  const active = path?.startsWith("/dashboard/reports/") ? "/dashboard" : path;
  const pro = plan === "pro";

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-x-8 gap-y-3 border-b border-hairline bg-canvas px-8 py-3 text-ink lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-8 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
      <Link href="/dashboard" className="text-title-md font-extrabold lg:px-3">Fin<b className="text-primary">Sight</b></Link>
      <nav aria-label="대시보드" className="order-last w-full sm:order-none sm:w-auto">
        <ul className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:gap-1">
          {MENU.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={active === href ? "page" : undefined} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-nav-link text-body transition-colors duration-150 aria-[current=page]:bg-surface-strong aria-[current=page]:font-semibold aria-[current=page]:text-ink lg:flex lg:h-11 lg:gap-3">
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" className="hidden shrink-0 text-body lg:block" />
                {label}
                {href === "/dashboard/trends" && !pro && <span className="lg:ml-auto"><Badge variant="lock">프로</Badge></span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="ml-auto flex items-center justify-between gap-2 lg:mt-auto lg:ml-0 lg:rounded-xl lg:border lg:border-hairline lg:p-4">
        <span className="hidden text-caption text-muted lg:inline">현재 플랜</span>
        <Badge variant={pro ? "pro" : "default"}>{pro ? "프로" : "무료"}</Badge>
      </div>
    </header>
  );
}
