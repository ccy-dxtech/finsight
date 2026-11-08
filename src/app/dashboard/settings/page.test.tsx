import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Settings from "./page";

const { getSessionPlan, signOut } = vi.hoisted(() => ({ getSessionPlan: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase/session-plan", () => ({ getSessionPlan }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

beforeEach(() => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "free" });
  signOut.mockResolvedValue({ error: null });
});
afterEach(() => vi.clearAllMocks());

it("무료 플랜과 삭제·로그아웃을 표시하고 포털은 숨긴다", async () => {
  const html = renderToStaticMarkup(await Settings());
  expect(html).toContain("무료");
  expect(html).toContain("내 데이터 전체 삭제");
  expect(html).toContain("계정, 구독, 이번 달 사용 횟수는 그대로예요");
  expect(html).toContain("로그아웃");
  expect(html).not.toContain('href="/api/portal"');
});

it("DB 프로 플랜일 때만 고객 포털 링크를 표시한다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "pro" });
  const html = renderToStaticMarkup(await Settings());
  expect(html).toContain("프로");
  expect(html).toContain('href="/api/portal"');
});

it("로그아웃 서버 액션은 세션을 종료한 뒤 랜딩으로 이동한다", async () => {
  const page = await Settings();
  const rows = page.props.children[1].props.children;
  const action = rows.find((row: { props?: { title?: string } }) => row?.props?.title === "로그아웃").props.action.props.action;
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
