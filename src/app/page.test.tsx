import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "./page";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser } }) }));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it("비로그인 랜딩에 히어로, 사용 방법, 요금제, 푸터를 순서대로 표시한다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  vi.stubEnv("NEXT_PUBLIC_PRO_PRICE_LABEL", "월 2,000원");
  const html = renderToStaticMarkup(await Home());
  expect(html).toContain('href="/login"');
  expect(html).toContain("월 2,000원");
  expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<ol"));
  expect(html.indexOf("<ol")).toBeLessThan(html.indexOf("월 3회 분석"));
  expect(html.indexOf("월 30회 분석")).toBeLessThan(html.indexOf("<footer"));
  expect(html).toMatch(/<footer[^>]*>.*FinSight/);
  expect(html).not.toMatch(/Get started|Upgrade|Powered by AI|FAQ/);
});

it("인증된 사용자는 히어로에서 대시보드로 이동한다", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  const html = renderToStaticMarkup(await Home());
  expect(html).toMatch(/href="\/dashboard"[^>]*>대시보드로 가기<\/a>/);
});
