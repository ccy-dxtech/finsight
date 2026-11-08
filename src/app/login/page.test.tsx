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

it("비로그인이면 랜딩으로 가는 로고 → 한 문장 → Google 버튼 순서로 표시한다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toMatch(/<a[^>]*href="\/"[^>]*>Fin<b[^>]*>Sight<\/b><\/a>/);
  expect(html.indexOf("Sight")).toBeLessThan(html.indexOf("Google 계정으로 바로 시작해요"));
  expect(html.indexOf("Google 계정으로 바로 시작해요")).toBeLessThan(html.indexOf("Google 계정으로 로그인"));
  expect(html).not.toContain("결제");
});

it("결제하려다 로그인 화면에 오면 결제로 이어진다고 알려준다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ next: "/api/checkout" }) }));
  expect(html).toContain("로그인하면 프로 구독 결제로 이어져요");
  expect(html).not.toContain("Google 계정으로 바로 시작해요");
});

it("next가 여러 번 전달되면 기본 대시보드로 보낸다", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  await expect(LoginPage({ searchParams: Promise.resolve({ next: ["/dashboard", "//evil.com"] }) })).rejects.toThrow("redirect:/dashboard");
});
