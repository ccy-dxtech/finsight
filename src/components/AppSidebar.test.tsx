import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppSidebar } from "./AppSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/settings" }));

it("배너 안에 홈·월별 추이·설정 메뉴를 아이콘과 함께 둔다", () => {
  const html = renderToStaticMarkup(<AppSidebar plan="pro" currentPath="/dashboard" />);
  expect(html).toMatch(/^<header/);
  expect(html).toContain('aria-label="대시보드"');
  for (const href of ["/dashboard", "/dashboard/trends", "/dashboard/settings"]) {
    expect(html).toContain(`href="${href}"`);
  }
  expect(html).toContain("lucide-house");
  expect(html).toContain("lucide-chart-no-axes-column");
  expect(html).toContain("lucide-settings");
});

it("무료 플랜 배지를 보여주고 월별 추이에 잠금 배지를 단다", () => {
  const html = renderToStaticMarkup(<AppSidebar plan="free" currentPath="/dashboard/trends" />);
  expect(html).toContain("현재 플랜");
  expect(html).toMatch(/>무료<\/span>/);
  expect(html).toContain("lucide-lock");
  expect(html).toMatch(/<a(?=[^>]*href="\/dashboard\/trends")(?=[^>]*aria-current="page")[^>]*>/);
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
});

it("프로 플랜은 잠금 없이 프로 배지를 보여주고, 리포트 상세는 홈에 속한다", () => {
  const html = renderToStaticMarkup(<AppSidebar plan="pro" currentPath="/dashboard/reports/id" />);
  expect(html).toMatch(/>프로<\/span>/);
  expect(html).not.toContain("lucide-lock");
  expect(html).toMatch(/<a(?=[^>]*href="\/dashboard")(?=[^>]*aria-current="page")[^>]*>/);
});

// 한도 설명과 "프로 구독하기"는 홈 플랜 카드와 설정의 플랜 행이 맡는다. 사이드바에 겹쳐 두지 않는다.
it.each(["free", "pro"] as const)("사이드바 플랜 카드에는 배지만 두고 한도 문장·결제 버튼은 두지 않는다(%s)", (plan) => {
  const html = renderToStaticMarkup(<AppSidebar plan={plan} />);
  expect(html).not.toContain("한 달에");
  expect(html).not.toContain("/api/checkout");
  expect(html).not.toContain("프로 구독하기");
});

it("경로를 생략하면 현재 브라우저 경로를 따른다", () => {
  expect(renderToStaticMarkup(<AppSidebar plan="free" />)).toMatch(/<a(?=[^>]*href="\/dashboard\/settings")(?=[^>]*aria-current="page")[^>]*>/);
});
