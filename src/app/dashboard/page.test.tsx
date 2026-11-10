import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Dashboard from "./page";

const { getSessionPlan, from, usage, reports, eq, order } = vi.hoisted(() => ({
  getSessionPlan: vi.fn(), from: vi.fn(), usage: vi.fn(), reports: vi.fn(), eq: vi.fn(), order: vi.fn(),
}));
vi.mock("@/lib/supabase/session-plan", () => ({ getSessionPlan }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ from }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

const render = async (searchParams: { checkout?: string } = {}) =>
  renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve(searchParams) }));
const count = (html: string, text: string) => html.split(text).length - 1;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T16:00:00Z"));
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "free" });
  usage.mockResolvedValue({ data: { count: 1 }, error: null });
  reports.mockResolvedValue({ data: [], error: null });
  from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { eq(table, key, value); return query; },
      maybeSingle: usage,
      order: (key: string, options: unknown) => { order(key, options); return reports(); },
    };
    return query;
  });
});
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

const storedReport = (id: string, fileName: string, categoryTotals: Record<string, string>) => ({
  id, file_name: fileName, period_start: "2026-10-01", period_end: "2026-10-31",
  totals: { totalAmount: Object.values(categoryTotals).reduce((sum, amount) => sum + BigInt(amount), 0n).toString(), categoryTotals },
  created_at: "2026-11-01T00:00:00Z",
});

it("사용자와 KST 월로 조회하고 업로드·분석하기, 잔여 횟수, 플랜, 카테고리별 지출, 빈 목록을 순서대로 표시한다", async () => {
  const html = await render();
  const positions = ['type="file"', ">분석하기<", 'role="meter"', ">플랜<", ">카테고리별 지출<", ">최근 리포트<"]
    .map((text) => html.indexOf(text));
  expect(positions.every((index) => index >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(html).toContain('aria-valuenow="2"');
  expect(html).toContain("아직 리포트가 없어요");
  expect(html).toContain("명세서를 분석하면 카테고리별 지출이 여기에 보여요");
  expect(eq).toHaveBeenCalledWith("usage", "user_id", "user");
  expect(eq).toHaveBeenCalledWith("usage", "month", "2026-11-01");
  expect(eq).toHaveBeenCalledWith("reports", "user_id", "user");
  expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
});

it("무료는 플랜 카드에 가격과 보조 버튼 프로 구독하기, 테스트 결제 문구를 둔다", async () => {
  vi.stubEnv("NEXT_PUBLIC_PRO_PRICE_LABEL", "월 2,000원");
  const html = await render();
  vi.unstubAllEnvs();
  const plan = html.slice(html.indexOf(">플랜<"), html.indexOf("카테고리별 지출"));
  expect(plan).toContain("무료");
  expect(plan).toContain("월 2,000원");
  expect(plan).toMatch(/<a[^>]*href="\/api\/checkout"[^>]*bg-surface-strong[^>]*>프로 구독하기<\/a>/);
  expect(plan).toContain("테스트 결제 환경이며 실제로 청구되지 않습니다");
  expect(count(html, 'href="/api/checkout"')).toBe(1);
  expect(count(html, "bg-primary text-on-primary")).toBe(1);
});

it("프로는 플랜 카드에서 결제 대신 월별 추이로 보낸다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "pro" });
  const html = await render();
  const plan = html.slice(html.indexOf(">플랜<"), html.indexOf("카테고리별 지출"));
  expect(plan).toContain("프로");
  expect(plan).toMatch(/<a[^>]*href="\/dashboard\/trends"[^>]*>월별 추이 보기<\/a>/);
  expect(html).not.toContain("/api/checkout");
});

it("가장 최근 리포트의 카테고리별 지출을 금액순으로 보여 주고 그 리포트로 보낸다", async () => {
  reports.mockResolvedValue({ data: [
    storedReport("latest", "신한카드.xlsx", { 식비: "30000", 교통: "50000", 교육: "0" }),
    storedReport("older", "국민카드.csv", { 쇼핑: "990000" }),
  ], error: null });
  const html = await render();
  const bars = html.slice(html.indexOf(">카테고리별 지출<"), html.indexOf(">최근 리포트<"));
  expect(bars).toContain("신한카드.xlsx");
  expect(bars).toContain("10.01–10.31");
  expect(bars).toMatch(/<a[^>]*href="\/dashboard\/reports\/latest"[^>]*>리포트 보기<\/a>/);
  expect(bars.indexOf("교통")).toBeLessThan(bars.indexOf("식비"));
  expect(bars).toContain("50,000");
  expect(bars).not.toContain("교육");
  expect(bars).not.toContain("쇼핑");
  expect(bars).not.toContain("명세서를 분석하면");
});

it("무료가 횟수를 다 쓰면 업로드 영역 자리에 결제로 가는 카드 하나만 둔다", async () => {
  usage.mockResolvedValue({ data: { count: 3 }, error: null });
  const html = await render();
  expect(html).not.toContain('type="file"');
  expect(html.indexOf("이번 달 분석 3회를 모두 썼어요")).toBeLessThan(html.indexOf('role="meter"'));
  expect(count(html, 'href="/api/checkout"')).toBe(1);
  expect(html).not.toContain("/#pricing");
});

it("프로가 횟수를 다 쓰면 업그레이드 없이 다시 채워지는 때만 알린다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "pro" });
  usage.mockResolvedValue({ data: { count: 30 }, error: null });
  const html = await render();
  expect(html).not.toContain('type="file"');
  expect(html).toContain("이번 달 분석 30회를 모두 썼어요");
  expect(html).toContain("다음 달 1일 00:00(KST)에 다시 채워져요.");
  expect(html).not.toContain("/api/checkout");
  expect(html).not.toContain("/#pricing");
});

it("결제 성공 쿼리에서 아직 무료면 결제 확인 중 안내만 표시하고 무료 한도를 유지한다", async () => {
  const html = await render({ checkout: "success" });
  expect(html).toContain("결제 확인 중이에요");
  expect(html).toContain('aria-valuemax="3"');
  expect(html).not.toContain("프로 구독을 시작했어요");
});

it("결제 성공 쿼리에서 이미 프로면 성공 안내와 월별 추이 보기를 표시한다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "pro" });
  const html = await render({ checkout: "success" });
  expect(html).toMatch(/role="status".*<strong>프로 구독을 시작했어요\.<\/strong> 이제 월별 추이를 볼 수 있어요\./);
  expect(html).toMatch(/<a[^>]*href="\/dashboard\/trends"[^>]*>월별 추이 보기<\/a>/);
  expect(html).not.toContain("결제 확인 중이에요");
});

it("DB 프로 플랜의 30회와 저장된 bigint 금액을 표시한다", async () => {
  getSessionPlan.mockResolvedValue({ userId: "user", plan: "pro" });
  usage.mockResolvedValue({ data: null, error: null });
  reports.mockResolvedValue({ data: [storedReport("report", "명세서.csv", { 식비: "9007199254740993" })], error: null });
  const html = await render();
  expect(html).toContain('aria-valuenow="30"');
  expect(html).toContain("9,007,199,254,740,993");
  expect(html).toContain('href="/dashboard/reports/report"');
});

it("조회 오류를 빈 리포트나 0회 사용으로 숨기지 않는다", async () => {
  usage.mockResolvedValue({ data: null, error: new Error("database") });
  await expect(render()).rejects.toThrow("대시보드를 불러오지 못했어요");
  usage.mockResolvedValue({ data: null, error: null });
  reports.mockResolvedValue({ data: null, error: new Error("database") });
  await expect(render()).rejects.toThrow("대시보드를 불러오지 못했어요");
});

it("로그인하지 않은 사용자는 로그인으로 보낸다", async () => {
  getSessionPlan.mockResolvedValue(null);
  await expect(render()).rejects.toThrow("redirect:/login");
  expect(from).not.toHaveBeenCalled();
});
