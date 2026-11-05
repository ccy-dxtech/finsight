import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "./page";

const { getUser, redirect } = vi.hoisted(() => ({ getUser: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser } }) }));
vi.mock("next/navigation", () => ({ redirect }));
afterEach(() => vi.clearAllMocks());

it.each([["/dashboard/trends?x=1", "/dashboard/trends?x=1"], ["https://evil.com", "/dashboard"]])("로그인 상태면 검증된 next로 이동한다: %s", async (next, expected) => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  await expect(LoginPage({ searchParams: Promise.resolve({ next }) })).rejects.toThrow(`redirect:${expected}`);
});

it("비로그인이면 버튼과 한국어 오류 안내를 표시한다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error: "auth_failed" }) }));
  expect(html).toContain("Google 계정으로 로그인");
  expect(html).toContain('role="alert"');
  expect(html).toContain("로그인하지 못했어요");
  expect(redirect).not.toHaveBeenCalled();
});

it("next가 여러 번 전달되면 기본 대시보드로 보낸다", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  await expect(LoginPage({ searchParams: Promise.resolve({ next: ["/dashboard", "//evil.com"] }) })).rejects.toThrow("redirect:/dashboard");
});
