import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportPage from "./page";

const { from, select, eq, single } = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ from }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
beforeEach(() => {
  vi.clearAllMocks();
  const query = { select, eq, maybeSingle: single };
  from.mockReturnValue(query); select.mockReturnValue(query); eq.mockReturnValue(query);
  single.mockResolvedValue({ data: {
    file_name: "명세서.csv", period_start: "2026-10-01", period_end: "2026-10-31", transaction_count: 7, excluded_count: 3,
    totals: { totalAmount: "9007199254740993", categoryTotals: { 식비: "200", 교통: "100", 쇼핑: "-10" } },
    insights: { summary: "식비가 가장 많아요", recurring: [{ transactions: [{ id: 1, occurredOn: "2026-10-03", merchant: "영상 구독", amount: "9007199254740993" }], note: "반복돼요" }], anomalies: [{ transaction: { id: 2, occurredOn: "2026-10-04", merchant: "환불", amount: "-1000" }, reason: "환불이 있어요" }], savingTips: [{ title: "구독을 확인해 보세요", detail: "이용하지 않는 구독이 있어요" }] },
  }, error: null });
});
const render = async () => renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ id: "report-id" }) }));

it("RLS 세션으로 리포트 한 행만 읽고 저장된 숫자·요약·인사이트를 순서대로 표시한다", async () => {
  const html = await render();
  expect(from).toHaveBeenCalledExactlyOnceWith("reports");
  expect(eq).toHaveBeenCalledWith("id", "report-id");
  expect(single).toHaveBeenCalledTimes(1);
  expect(html).toContain("9,007,199,254,740,993");
  expect(html).toContain("식비가 가장 많아요");
  expect(html).toContain("67%");
  expect(html).toContain("-1,000");
  const labels = ["총지출", "카테고리별 지출", "정기결제·구독", "이상 지출", "절약 제안"];
  for (let i = 1; i < labels.length; i++) expect(html.indexOf(labels[i - 1])).toBeLessThan(html.indexOf(labels[i]));
});

it("없거나 RLS로 보이지 않는 리포트는 404로 처리한다", async () => {
  single.mockResolvedValue({ data: null, error: null });
  await expect(render()).rejects.toThrow("not-found");
});

it("조회 장애를 404로 숨기지 않는다", async () => {
  single.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
  await expect(render()).rejects.toThrow("리포트를 불러오지 못했어요");
});

it("UUID가 아닌 리포트 경로는 404로 처리한다", async () => {
  single.mockResolvedValue({ data: null, error: { code: "22P02", message: "invalid input syntax for type uuid" } });
  await expect(ReportPage({ params: Promise.resolve({ id: "not-a-uuid" }) })).rejects.toThrow("not-found");
});
