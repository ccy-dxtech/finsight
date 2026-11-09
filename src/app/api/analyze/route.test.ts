import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { classifyMerchants, mapColumns, writeReport } from "@/services/claude";

const db = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: vi.fn(async () => db) }));
vi.mock("@/services/claude", () => ({ mapColumns: vi.fn(), classifyMerchants: vi.fn(), writeReport: vi.fn() }));

const csv = "날짜,가맹점,금액,카드번호,이름\n20261003,식당,12500,1234567890123456,비밀이름\n20261004,카페,-2500,1234567890123456,비밀이름\n20261005,금액없는가게,금액없음,,";
let plan: string;
let count: number | null;
let existing: { occurred_on: string; merchant: string; amount: string }[];
let readError: string | null;
const queries: { table: string; filters: unknown[][] }[] = [];

function request(content = csv, name = "카드.csv", extraFile = false) {
  const form = new FormData();
  form.append("file", new File([content], name));
  form.append("plan", "pro");
  if (extraFile) form.append("other", new File([csv], "다른.csv"));
  return new Request("http://localhost/api/analyze", { method: "POST", body: form, headers: { "x-plan": "pro" } });
}

beforeEach(() => {
  plan = "free"; count = null; existing = []; readError = null; queries.length = 0;
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-31T15:00:00Z"));
  db.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  db.rpc.mockResolvedValue({ data: "report-1", error: null });
  db.from.mockImplementation((table: string) => {
    const filters: unknown[][] = [];
    queries.push({ table, filters });
    const result = () => ({ data: table === "profiles" ? { plan } : table === "usage" ? (count === null ? null : { count }) : existing, error: readError });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: (...args: unknown[]) => { filters.push(args); return query; },
      gte: (...args: unknown[]) => { filters.push(["gte", ...args]); return query; },
      lte: (...args: unknown[]) => { filters.push(["lte", ...args]); return query; },
      order: vi.fn().mockReturnThis(),
      maybeSingle: async () => result(),
      range: async (start: number, end: number) => ({ ...result(), data: existing.slice(start, end + 1) }),
    };
    return query;
  });
  vi.mocked(mapColumns).mockResolvedValue({ headerRowIndex: 0, dateCol: 0, merchantCol: 1, amountCol: 2 });
  vi.mocked(classifyMerchants).mockResolvedValue([{ merchant: "食堂", category: "식비" }, { merchant: "식당", category: "식비" }]);
  vi.mocked(writeReport).mockResolvedValue({
    summary: "지출을 살펴봤어요.",
    recurring: [{ transactionIds: [2, 3], note: "반복 결제예요." }, { transactionIds: [2, 999], note: "잘못된 참조" }],
    anomalies: [{ transactionId: 3, reason: "환불이 있어요." }, { transactionId: 999, reason: "잘못된 참조" }],
    savingTips: [{ title: "구독 확인", detail: "사용 여부를 확인해 보세요." }],
  });
});
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

it("전체 거래로 리포트를 만들고 신규 거래만 원자적으로 저장한다", async () => {
  existing = [{ occurred_on: "2026-10-03", merchant: "식당", amount: "12500" }];
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ reportId: "report-1" });
  expect(writeReport).toHaveBeenCalledWith(expect.objectContaining({ plan: "free", transactions: [
    { id: 2, date: "2026-10-03", merchant: "식당", amount: 12500n, category: "식비" },
    { id: 3, date: "2026-10-04", merchant: "카페", amount: -2500n, category: "기타" },
  ] }));
  expect(db.rpc).toHaveBeenCalledOnce();
  const [name, payload] = db.rpc.mock.calls[0];
  expect(name).toBe("commit_analysis");
  expect(payload).toMatchObject({ p_month: "2026-11-01", p_transactions: [
    { occurred_on: "2026-10-04", merchant: "카페", amount: "-2500", category: "기타" },
  ], p_report: { file_name: "카드.csv", period_start: "2026-10-03", period_end: "2026-10-04", transaction_count: 2, excluded_count: 1,
    totals: { totalAmount: "10000", categoryTotals: { 식비: "12500", 기타: "-2500" } } } });
  expect(payload.p_report.insights.recurring).toHaveLength(1);
  expect(payload.p_report.insights.recurring[0].transactions).toHaveLength(2);
  expect(payload.p_report.insights.anomalies).toEqual([{ transaction: { id: 3, occurredOn: "2026-10-04", merchant: "카페", amount: "-2500", category: "기타" }, reason: "환불이 있어요." }]);
  const stored = JSON.stringify(payload);
  for (const secret of [csv, "1234567890123456", "비밀이름", "카드번호", "금액없는가게"]) expect(stored).not.toContain(secret);
  expect(queries.map(({ table }) => table)).toEqual(["profiles", "usage", "transactions"]);
  expect(queries[1].filters).toContainEqual(["month", "2026-11-01"]);
  expect(queries[2].filters).toEqual(expect.arrayContaining([["user_id", "user-1"], ["gte", "occurred_on", "2026-10-03"], ["lte", "occurred_on", "2026-10-04"]]));
  expect(JSON.stringify(vi.mocked(mapColumns).mock.calls)).not.toContain("1234567890123456");
});

it("PDF 명세서도 같은 흐름으로 분석하고 원본 머리말은 저장하지 않는다", async () => {
  const pdf = readFileSync(new URL("../../../../tests/fixtures/pdf/card-b-statement.pdf", import.meta.url));
  const form = new FormData();
  form.append("file", new File([pdf], "card-b-statement.pdf", { type: "application/pdf" }));
  vi.mocked(mapColumns).mockResolvedValue({ headerRowIndex: 3, dateCol: 1, merchantCol: 0, amountCol: 2 });
  vi.mocked(writeReport).mockResolvedValue({ summary: "지출을 살펴봤어요.", recurring: [], anomalies: [], savingTips: [] });

  const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
  expect(response.status).toBe(200);
  const masked = vi.mocked(mapColumns).mock.calls[0][0];
  expect(masked).toHaveLength(10);
  expect(masked[3]).toEqual(["이용하신 곳", "이용일", "이용금액", "할부", "이번 달 결제금액"]);
  const [, payload] = db.rpc.mock.calls[0];
  expect(payload.p_report).toMatchObject({
    file_name: "card-b-statement.pdf", period_start: "2026-11-02", period_end: "2026-11-29",
    transaction_count: 20, excluded_count: 1, totals: { totalAmount: "1603300" },
  });
  expect(payload.p_transactions).toHaveLength(20);
  expect(JSON.stringify(payload)).not.toMatch(/홍길동|합계|AMAZON/);
});

it("로그인이 없으면 401이며 AI·DB 쓰기를 하지 않는다", async () => {
  db.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await POST(request())).status).toBe(401);
  expect(db.from).not.toHaveBeenCalled(); expect(mapColumns).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
});

it.each(["unsupported_file", "file_too_large", "columns_not_found", "too_many_rows", "no_transactions", "already_analyzed", "quota_exceeded", "ai_failed"])("%s 오류에서는 저장·차감하지 않는다", async (code) => {
  let content = csv; let name = "카드.csv";
  if (code === "unsupported_file") name = "카드.hwp";
  if (code === "file_too_large") content = "a".repeat(4 * 1024 * 1024 + 1);
  if (code === "columns_not_found") vi.mocked(mapColumns).mockResolvedValue(null);
  if (code === "too_many_rows") content = "날짜,가맹점,금액\n" + "20261003,가게,1\n".repeat(3001);
  if (code === "no_transactions") content = "날짜,가맹점,금액";
  if (code === "already_analyzed") existing = [{ occurred_on: "2026-10-03", merchant: "식당", amount: "12500" }, { occurred_on: "2026-10-04", merchant: "카페", amount: "-2500" }];
  if (code === "quota_exceeded") count = 3;
  if (code === "ai_failed") vi.mocked(writeReport).mockRejectedValue(new Error("비밀 거래 내용"));
  const response = await POST(request(content, name));
  expect(response.status).toBe(code === "ai_failed" ? 500 : code === "quota_exceeded" ? 429 : 400);
  const body = await response.json();
  expect(body.error).toBe(code);
  expect(body.message).toMatch(/^\*\*.+\*\* .+ 횟수는 차감되지 않았어요\.$/);
  expect(JSON.stringify(body)).not.toContain("비밀 거래 내용");
  expect(db.rpc).not.toHaveBeenCalled();
  if (code === "quota_exceeded") {
    expect(mapColumns).not.toHaveBeenCalled(); expect(classifyMerchants).not.toHaveBeenCalled(); expect(writeReport).not.toHaveBeenCalled();
  }
  if (code === "already_analyzed") expect(classifyMerchants).not.toHaveBeenCalled();
});

it.each(["mapping", "classification", "database"])("%s 실패도 저장하지 않는다", async (stage) => {
  if (stage === "mapping") vi.mocked(mapColumns).mockRejectedValue(new Error("secret"));
  if (stage === "classification") vi.mocked(classifyMerchants).mockRejectedValue(new Error("secret"));
  if (stage === "database") readError = "secret";
  const response = await POST(request());
  expect(response.status).toBe(500); expect(db.rpc).not.toHaveBeenCalled();
});

it("여러 파일과 잘못된 multipart를 거절한다", async () => {
  expect((await POST(request(csv, "카드.csv", true))).status).toBe(400);
  expect((await POST(new Request("http://localhost/api/analyze", { method: "POST", body: "invalid" }))).status).toBe(400);
  expect(db.rpc).not.toHaveBeenCalled();
});

it("프로는 무료 한도를 넘어서 분석할 수 있고 30회에서는 중단한다", async () => {
  plan = "pro"; count = 3;
  expect((await POST(request())).status).toBe(200);
  expect(writeReport).toHaveBeenCalledWith(expect.objectContaining({ plan: "pro" }));
  db.rpc.mockClear(); count = 30;
  expect((await POST(request())).status).toBe(429); expect(db.rpc).not.toHaveBeenCalled();
});

it("고유 가맹점을 최대 200개씩 병렬로 분류한다", async () => {
  const content = "날짜,가맹점,금액\n" + Array.from({ length: 401 }, (_, i) => `20261003,가게${i},1`).join("\n");
  const pending: (() => void)[] = [];
  vi.mocked(classifyMerchants).mockImplementation(() => new Promise((resolve) => { pending.push(() => resolve([])); if (pending.length === 3) pending.forEach((finish) => finish()); }));
  expect((await POST(request(content))).status).toBe(200);
  expect(vi.mocked(classifyMerchants).mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 1]);
});

it("1,000행 뒤의 기존 거래도 확인한다", async () => {
  existing = [...Array.from({ length: 1000 }, () => ({ occurred_on: "2026-10-03", merchant: "다른가게", amount: "1" })),
    { occurred_on: "2026-10-03", merchant: "식당", amount: "12500" }, { occurred_on: "2026-10-04", merchant: "카페", amount: "-2500" }];
  expect((await POST(request())).status).toBe(400); expect(db.rpc).not.toHaveBeenCalled();
});

it("큰 정수와 같은 파일의 동일 거래를 정밀도 손실 없이 보존한다", async () => {
  const content = "날짜,가맹점,금액\n20261003,가게,9007199254740993\n20261003,가게,9007199254740993";
  expect((await POST(request(content))).status).toBe(200);
  expect(db.rpc.mock.calls[0][1].p_report.totals.totalAmount).toBe("18014398509481986");
  expect(db.rpc.mock.calls[0][1].p_transactions).toHaveLength(2);
  expect(vi.mocked(writeReport).mock.calls[0][0].transactions[0].amount).toBe(9007199254740993n);
});

it("커밋 실패는 내부 정보를 반환하지 않고 5xx로 안내한다", async () => {
  db.rpc.mockResolvedValue({ data: null, error: { message: "secret" } });
  const response = await POST(request());
  expect(response.status).toBe(500); expect(await response.json()).toMatchObject({ error: "ai_failed" });
});
