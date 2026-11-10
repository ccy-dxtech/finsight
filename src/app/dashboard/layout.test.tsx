import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardLayout from "./layout";

const { getSessionPlan } = vi.hoisted(() => ({ getSessionPlan: vi.fn() }));
vi.mock("@/lib/supabase/session-plan", () => ({ getSessionPlan }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
afterEach(() => vi.clearAllMocks());

it("세션이 없으면 자식을 표시하기 전에 로그인으로 보낸다", async () => {
  getSessionPlan.mockResolvedValue(null);
  await expect(DashboardLayout({ children: <p>보호된 내용</p> })).rejects.toThrow("redirect:/login");
});

it("검증된 사용자에게 사이드바와 자식을 함께 렌더링한다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", email: "me@example.com", plan: "pro" });
  const html = renderToStaticMarkup(await DashboardLayout({ children: <p>보호된 내용</p> }));
  expect(html).toContain("보호된 내용");
  expect(html).toContain("현재 플랜");
  expect(html).toMatch(/>프로<\/span>/);
  expect(html).toContain('aria-label="대시보드"');
  // 사이드바가 본문보다 먼저 나와야 키보드·스크린리더 순서가 화면 순서와 같다.
  expect(html.indexOf("<header")).toBeLessThan(html.indexOf("보호된 내용"));
});

it("플랜을 읽지 못하면 오류를 오류 화면으로 넘긴다", async () => {
  getSessionPlan.mockRejectedValue(new Error("플랜 정보를 불러오지 못했어요."));
  await expect(DashboardLayout({ children: <p>보호된 내용</p> })).rejects.toThrow("플랜 정보를 불러오지 못했어요");
});
