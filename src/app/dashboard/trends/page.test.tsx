import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Trends from "./page";

const { getSessionPlan, from, select, eq, gt, limit } = vi.hoisted(() => ({
  getSessionPlan: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), gt: vi.fn(), limit: vi.fn(),
}));
vi.mock("@/lib/supabase/session-plan", () => ({ getSessionPlan }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ from }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

const row = (id: string, occurred_on: string, amount: string, category = "식비") => ({ id, occurred_on, merchant: "가게", amount, category });

beforeEach(() => {
  vi.useFakeTimers();
  // 11월 20일(KST)에 10월 명세서까지 올린 상황
  vi.setSystemTime(new Date("2026-11-20T03:00:00Z"));
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "pro" });
  limit.mockResolvedValue({ data: [], error: null });
  from.mockImplementation((table: string) => {
    const query = {
      select: (columns: string) => { select(table, columns); return query; },
      eq: (key: string, value: string) => { eq(table, key, value); return query; },
      gt: (key: string, value: string) => { gt(key, value); return query; },
      order: () => query,
      limit,
    };
    return query;
  });
});
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

it("무료는 잠금만 표시하며 거래를 조회하지 않는다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "free" });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("프로 전용");
  expect(from).not.toHaveBeenCalled();
});

it("오늘 기준 이번 달이 아니라 거래가 있는 가장 최근 달과 그 전달을 비교한다", async () => {
  limit.mockResolvedValue({ data: [
    row("a", "2026-09-03", "100"), row("b", "2026-10-02", "44300"), row("c", "2026-10-20", "100"),
  ], error: null });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("카테고리별 2026년 9월과 2026년 10월 지출 비교");
  expect(html).toContain("▲ +44,300");
  expect(html).not.toContain("▼");
  expect(eq).toHaveBeenCalledWith("transactions", "user_id", "user");
  expect(select).toHaveBeenCalledWith("transactions", "id,occurred_on,merchant,amount::text,category");
});

it("한 달 치만 있으면 차트는 보여주고 표 대신 전달 명세서를 올리라고 안내한다", async () => {
  limit.mockResolvedValue({ data: [row("a", "2026-10-02", "100")], error: null });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("2026년 10월");
  expect(html).toContain("2026년 9월 명세서를 올리면");
  expect(html).not.toContain("<table");
});

it("1,000건씩 마지막 id 다음부터 이어 읽어 중복 없이 큰 금액을 정확히 합산한다", async () => {
  const firstPage = Array.from({ length: 1000 }, (_, i) => row(`id-${String(i).padStart(4, "0")}`, "2026-10-01", "1", "쇼핑"));
  limit.mockResolvedValueOnce({ data: firstPage, error: null })
    .mockResolvedValueOnce({ data: [row("id-1000", "2026-10-02", "9007199254740993", "쇼핑")], error: null });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("9,007,199,254,741,993");
  expect(limit.mock.calls).toEqual([[1000], [1000]]);
  expect(gt.mock.calls).toEqual([["id", "id-0999"]]);
});

it("프로의 거래가 없으면 빈 상태와 명세서 올리기 버튼을 표시한다", async () => {
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("아직 저장된 거래가 없어요");
  expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>명세서 올리기<\/a>/);
  expect(html).not.toContain("<table");
});

it("조회 실패를 빈 상태나 무료로 숨기지 않는다", async () => {
  limit.mockResolvedValue({ data: null, error: new Error("database") });
  await expect(Trends()).rejects.toThrow("월별 추이를 불러오지 못했어요");
  getSessionPlan.mockRejectedValue(new Error("플랜 정보를 불러오지 못했어요."));
  await expect(Trends()).rejects.toThrow("플랜 정보를 불러오지 못했어요");
});

it("로그인하지 않은 사용자는 로그인으로 보낸다", async () => {
  getSessionPlan.mockResolvedValue(null);
  await expect(Trends()).rejects.toThrow("redirect:/login");
  expect(from).not.toHaveBeenCalled();
});
