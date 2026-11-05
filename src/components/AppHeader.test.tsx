import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/settings" }));

it("무료 플랜과 잠금 배지, 현재 탭을 표시한다", () => {
  const html = renderToStaticMarkup(<AppHeader plan="free" currentPath="/dashboard/trends" />);
  expect(html).toContain("무료");
  expect(html).toContain("lucide-lock");
  expect(html).toMatch(/<a(?=[^>]*href="\/dashboard\/trends")(?=[^>]*aria-current="page")[^>]*>/);
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
});

it("리포트 상세는 홈 탭에 속하고 프로에는 잠금이 없다", () => {
  const html = renderToStaticMarkup(<AppHeader plan="pro" currentPath="/dashboard/reports/id" />);
  expect(html).toMatch(/<a(?=[^>]*href="\/dashboard")(?=[^>]*aria-current="page")[^>]*>/);
  expect(html).toContain("프로");
  expect(html).not.toContain("lucide-lock");
});

it("레이아웃에서 경로를 생략하면 현재 브라우저 경로를 따른다", () => {
  expect(renderToStaticMarkup(<AppHeader plan="free" />)).toMatch(/<a(?=[^>]*href="\/dashboard\/settings")(?=[^>]*aria-current="page")[^>]*>/);
});
