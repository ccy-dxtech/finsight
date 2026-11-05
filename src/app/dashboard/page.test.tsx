import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Dashboard from "./page";

const { getUser, from, profile, usage, reports, eq, order } = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), profile: vi.fn(), usage: vi.fn(), reports: vi.fn(), eq: vi.fn(), order: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser }, from }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T16:00:00Z"));
  getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  profile.mockResolvedValue({ data: { plan: "free" }, error: null });
  usage.mockResolvedValue({ data: { count: 1 }, error: null });
  reports.mockResolvedValue({ data: [], error: null });
  from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { eq(table, key, value); return query; },
      maybeSingle: table === "profiles" ? profile : usage,
      order: (key: string, options: unknown) => { order(key, options); return reports(); },
    };
    return query;
  });
});
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

it("사용자와 KST 월로 조회하고 업로드, 잔여 횟수, 빈 목록을 순서대로 표시한다", async () => {
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
  expect(html.indexOf('type="file"')).toBeLessThan(html.indexOf('role="meter"'));
  expect(html.indexOf('role="meter"')).toBeLessThan(html.indexOf("최근 리포트"));
  expect(html).toContain('aria-valuenow="2"');
  expect(html).toContain("아직 리포트가 없어요");
  expect(eq).toHaveBeenCalledWith("usage", "month", "2026-11-01");
  expect(eq).toHaveBeenCalledWith("reports", "user_id", "user");
  expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
});

it("결제 성공 쿼리는 안내만 표시하고 무료의 한도는 유지한다", async () => {
  usage.mockResolvedValue({ data: { count: 3 }, error: null });
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({ checkout: "success" }) }));
  expect(html).toContain("결제 확인 중이에요");
  expect(html).toContain('aria-valuemax="3"');
  expect(html).toMatch(/<input[^>]*disabled=""/);
});

it("DB 프로 플랜의 30회와 저장된 bigint 금액을 표시한다", async () => {
  profile.mockResolvedValue({ data: { plan: "pro" }, error: null });
  usage.mockResolvedValue({ data: null, error: null });
  reports.mockResolvedValue({ data: [{ id: "report", file_name: "명세서.csv", period_start: "2026-10-01", period_end: "2026-10-31", totals: { totalAmount: "9007199254740993" }, created_at: "2026-11-01T00:00:00Z" }], error: null });
  const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('aria-valuenow="30"');
  expect(html).toContain("9,007,199,254,740,993");
  expect(html).toContain('href="/dashboard/reports/report"');
});

it("조회 오류를 빈 리포트나 0회 사용으로 숨기지 않는다", async () => {
  usage.mockResolvedValue({ data: null, error: new Error("database") });
  await expect(Dashboard({ searchParams: Promise.resolve({}) })).rejects.toThrow();
});
