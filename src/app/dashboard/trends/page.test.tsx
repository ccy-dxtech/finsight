import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Trends from "./page";

const { getUser, from, profile, range, select, eq } = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), profile: vi.fn(), range: vi.fn(), select: vi.fn(), eq: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser }, from }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-12-31T15:00:00Z"));
  getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  profile.mockResolvedValue({ data: { plan: "pro" }, error: null });
  range.mockResolvedValue({ data: [], error: null });
  from.mockImplementation((table: string) => {
    const query = {
      select: (columns: string) => { select(table, columns); return query; },
      eq: (key: string, value: string) => { eq(table, key, value); return query; },
      maybeSingle: profile, order: () => query, range,
    };
    return query;
  });
});
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

it("무료는 잠금만 표시하며 거래를 조회하지 않는다", async () => {
  profile.mockResolvedValue({ data: { plan: "free" }, error: null });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("프로 전용");
  expect(from).not.toHaveBeenCalledWith("transactions");
});

it("프로는 KST 새해 월 경계의 전월 대비와 월 합계를 계산한다", async () => {
  range.mockResolvedValue({ data: [
    { occurred_on: "2026-12-01", merchant: "식당", amount: "100", category: "식비" },
    { occurred_on: "2027-01-01", merchant: "식당", amount: "44300", category: "식비" },
    { occurred_on: "2027-01-01", merchant: "식당", amount: "100", category: "식비" },
  ], error: null });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("2027년 1월");
  expect(html).toContain("44,400");
  expect(html).toContain("▲ +44,300");
  expect(eq).toHaveBeenCalledWith("transactions", "user_id", "user");
  expect(select).toHaveBeenCalledWith("transactions", "occurred_on,merchant,amount::text,category");
});

it("1,000건 이후 거래도 읽고 큰 금액을 정확히 합산한다", async () => {
  range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, () => ({ occurred_on: "2027-01-01", merchant: "상점", amount: "1", category: "쇼핑" })), error: null })
    .mockResolvedValueOnce({ data: [{ occurred_on: "2027-01-02", merchant: "상점", amount: "9007199254740993", category: "쇼핑" }], error: null });
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("9,007,199,254,741,993");
  expect(range).toHaveBeenCalledWith(1000, 1999);
});

it("프로의 거래가 없으면 빈 상태를 표시한다", async () => {
  const html = renderToStaticMarkup(await Trends());
  expect(html).toContain("아직 저장된 거래가 없어요");
  expect(html).not.toContain("<table");
});

it("조회 실패를 빈 상태나 무료로 숨기지 않는다", async () => {
  range.mockResolvedValue({ data: null, error: new Error("database") });
  await expect(Trends()).rejects.toThrow("월별 추이를 불러오지 못했어요");
  profile.mockResolvedValue({ data: null, error: new Error("database") });
  await expect(Trends()).rejects.toThrow("플랜 정보를 불러오지 못했어요");
});

it("로그인하지 않은 사용자는 로그인으로 보낸다", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  await expect(Trends()).rejects.toThrow("redirect:/login");
  expect(from).not.toHaveBeenCalled();
});
