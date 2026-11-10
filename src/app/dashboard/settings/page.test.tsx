import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Settings from "./page";

const { getSessionPlan, signOut } = vi.hoisted(() => ({ getSessionPlan: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase/session-plan", () => ({ getSessionPlan }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

beforeEach(() => {
  getSessionPlan.mockResolvedValue({ userId: "user", email: "me@example.com", plan: "free" });
  signOut.mockResolvedValue({ error: null });
});
afterEach(() => vi.clearAllMocks());

it("무료 플랜 행에 배지·한도와 보조 버튼 '프로 구독하기', 테스트 결제 문구를 둔다", async () => {
  const html = renderToStaticMarkup(await Settings());
  expect(html).toMatch(/<h2[^>]*>플랜<span[^>]*>무료<\/span><\/h2>/);
  expect(html).toContain("한 달에 3회 분석할 수 있어요. 프로는 한 달에 30회 분석하고 월별 추이도 볼 수 있어요.");
  expect(html).toMatch(/<a(?=[^>]*href="\/api\/checkout")(?=[^>]*bg-surface-strong)[^>]*>프로 구독하기<\/a>/);
  expect(html).toContain("테스트 결제 환경이며 실제로 청구되지 않습니다");
  expect(html).not.toMatch(/bg-primary\s/); // 설정에는 초록 버튼을 두지 않는다
  expect(html).not.toContain('href="/api/portal"');
});

it("DB 프로 플랜이면 플랜 행에 구독 관리와 해지 뒤에도 데이터가 남는다는 안내를 둔다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", email: "me@example.com", plan: "pro" });
  const html = renderToStaticMarkup(await Settings());
  expect(html).toMatch(/<h2[^>]*>플랜<span[^>]*>프로<\/span><\/h2>/);
  expect(html).toContain("한 달에 30회 분석하고 월별 추이를 볼 수 있어요.");
  expect(html).toContain("해지해도 이번 결제 기간까지 프로가 유지되고, 저장된 거래와 리포트는 그대로예요.");
  expect(html).toMatch(/<a(?=[^>]*href="\/api\/portal")[^>]*>구독 관리<\/a>/);
  expect(html).not.toContain("/api/checkout");
});

it("로그인한 Google 계정 이메일과 로그아웃, 전체 삭제를 표시한다", async () => {
  const html = renderToStaticMarkup(await Settings());
  expect(html).toContain("Google 계정");
  expect(html).toContain("me@example.com");
  expect(html).toContain("로그아웃");
  expect(html).toContain("내 데이터 전체 삭제");
  expect(html).toContain("계정, 구독, 이번 달 사용 횟수는 그대로예요");
  // 되돌릴 수 없는 삭제는 맨 아래에 떨어뜨려 둔다.
  expect(html.indexOf("로그아웃")).toBeLessThan(html.indexOf("내 데이터 전체 삭제"));
});

it("이메일이 없으면 설명 없이 계정 행을 둔다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", email: null, plan: "free" });
  const html = renderToStaticMarkup(await Settings());
  expect(html).toMatch(/<h2[^>]*>Google 계정<\/h2><\/div>/);
});

it("로그아웃 서버 액션은 세션을 종료한 뒤 랜딩으로 이동한다", async () => {
  const page = await Settings();
  const rows = page.props.children[1].props.children;
  const action = rows.find((row: { props?: { title?: string } }) => row?.props?.title === "Google 계정").props.action.props.action;
  await expect(action()).rejects.toThrow("redirect:/");
  expect(signOut).toHaveBeenCalledOnce();
  signOut.mockResolvedValue({ error: new Error("auth") });
  await expect(action()).rejects.toThrow("로그아웃하지 못했어요");
});

it("플랜 조회 실패를 무료로 숨기지 않는다", async () => {
  getSessionPlan.mockRejectedValue(new Error("플랜 정보를 불러오지 못했어요."));
  await expect(Settings()).rejects.toThrow("플랜 정보를 불러오지 못했어요");
});

it("비로그인은 로그인으로 이동한다", async () => {
  getSessionPlan.mockResolvedValue(null);
  await expect(Settings()).rejects.toThrow("redirect:/login");
});
