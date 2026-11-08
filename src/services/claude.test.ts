import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { AiFailedError, classifyMerchants, mapColumns, writeReport } from "./claude";

const sdk = vi.hoisted(() => ({ parse: vi.fn(), stream: vi.fn(), finalMessage: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function () {
    return { messages: { parse: sdk.parse, stream: sdk.stream } };
  }),
}));

const mapping = { headerRowIndex: 0, dateCol: 0, merchantCol: 1, amountCol: 2 };
const draft = {
  summary: "카페 이용이 자주 보여요.",
  recurring: [{ transactionIds: [1, 2], note: "반복되는 결제가 있어요." }],
  anomalies: [{ transactionId: 2, reason: "평소와 다른 이용이 보여요." }],
  savingTips: [{ title: "정기결제 살펴보기", detail: "사용하지 않는 구독을 확인해 보세요." }],
};
const input = {
  plan: "free" as const,
  categoryTotals: Object.fromEntries(CATEGORIES.map((category) => [category, 0n])) as Record<(typeof CATEGORIES)[number], bigint>,
  transactions: [{ id: 1, date: "2026-10-01", merchant: "카페", amount: 9007199254740993n, category: "카페·간식" as const }],
};

beforeEach(() => {
  vi.stubEnv("CLAUDE_MODEL_FAST", "test-fast-model");
  vi.stubEnv("CLAUDE_MODEL_REPORT_FREE", "test-free-model");
  vi.stubEnv("CLAUDE_MODEL_REPORT_PRO", "test-pro-model");
  sdk.stream.mockReturnValue({ finalMessage: sdk.finalMessage });
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

it("마스킹된 행으로 열 매핑을 요청하고 인덱스를 반환한다", async () => {
  sdk.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { mapping } });
  const rows = [["날짜", "가맹점", "원화 이용금액"], ["2026-10-01", "카페", "****"]];
  expect(await mapColumns(rows)).toEqual(mapping);
  expect(sdk.parse).toHaveBeenCalledWith(expect.objectContaining({
    model: "test-fast-model", max_tokens: 16000,
    messages: [{ role: "user", content: JSON.stringify(rows) }],
    output_config: expect.objectContaining({ effort: "low" }),
  }));
});

it("열을 찾지 못한 정상 응답은 null을 반환한다", async () => {
  sdk.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { mapping: null } });
  expect(await mapColumns([])).toBeNull();
});

it("고정 카테고리로 가맹점 분류를 반환한다", async () => {
  const classifications = [{ merchant: "카페", category: "카페·간식" }];
  sdk.parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { classifications } });
  expect(await classifyMerchants(["카페"])).toEqual(classifications);
  expect(sdk.parse).toHaveBeenCalledWith(expect.objectContaining({
    model: "test-fast-model", max_tokens: 16000,
    messages: [{ role: "user", content: JSON.stringify(["카페"]) }],
    output_config: expect.objectContaining({ effort: "low" }),
  }));
});

it("리포트는 스트리밍 최종 응답에서 거래 ID와 한국어 문장을 반환한다", async () => {
  sdk.finalMessage.mockResolvedValue({ stop_reason: "end_turn", parsed_output: draft });
  expect(await writeReport(input)).toEqual(draft);
  expect(sdk.finalMessage).toHaveBeenCalledOnce();
  expect(sdk.parse).not.toHaveBeenCalled();
  const request = sdk.stream.mock.calls[0][0];
  expect(request).toMatchObject({ model: "test-free-model", max_tokens: 64000, output_config: { effort: "medium" } });
  expect(JSON.parse(request.messages[0].content)).toEqual({
    categoryTotals: Object.fromEntries(CATEGORIES.map((category) => [category, "0"])),
    transactions: [{ ...input.transactions[0], amount: "9007199254740993" }],
  });
  expect(request.system).toContain("금액을 계산해 쓰지 말고 거래 id로 참조하라");
  expect(request.system).toContain("한국어 해요체");
  expect(request.system).toContain("관찰");
  expect(request.system).toContain("느낌표");
  expect(request.system).toContain("이모지");
});

it("무료와 프로는 모델만 다르고 프롬프트·스키마·설정은 같다", async () => {
  sdk.finalMessage.mockResolvedValue({ stop_reason: "end_turn", parsed_output: draft });
  await writeReport(input);
  await writeReport({ ...input, plan: "pro" });
  const [free, pro] = sdk.stream.mock.calls.map(([request]) => request);
  expect(free.model).toBe("test-free-model");
  expect(pro.model).toBe("test-pro-model");
  expect(JSON.stringify({ ...free, model: undefined })).toBe(JSON.stringify({ ...pro, model: undefined }));
});

const cases = [
  { name: "열 매핑", call: () => mapColumns([]), result: () => sdk.parse,
    valid: { mapping }, invalid: { mapping: { ...mapping, dateCol: -1 } } },
  { name: "가맹점 분류", call: () => classifyMerchants(["카페"]), result: () => sdk.parse,
    valid: { classifications: [{ merchant: "카페", category: "카페·간식" }] },
    invalid: { classifications: [{ merchant: "카페", category: "미등록 분류" }] } },
  { name: "리포트", call: () => writeReport(input), result: () => sdk.finalMessage,
    valid: draft, invalid: { ...draft, anomalies: [{ transactionId: "2", reason: "관찰" }] } },
];

describe.each(cases)("$name 실패 처리", ({ call, result, valid, invalid }) => {
  it("스키마를 다시 검증하고 위반을 ai_failed로 바꾼다", async () => {
    result().mockResolvedValue({ stop_reason: "end_turn", parsed_output: invalid });
    await expect(call()).rejects.toMatchObject({ code: "ai_failed", name: "AiFailedError" });
  });

  it.each(["refusal", "max_tokens"])("%s는 정상 데이터가 있어도 실패한다", async (stop_reason) => {
    result().mockResolvedValue({ stop_reason, parsed_output: valid });
    await expect(call()).rejects.toBeInstanceOf(AiFailedError);
  });

  it("중단 사유를 parsed_output보다 먼저 확인한다", async () => {
    const read = vi.fn(() => { throw new Error("읽으면 안 됨"); });
    result().mockResolvedValue({ stop_reason: "refusal", get parsed_output() { return read(); } });
    await expect(call()).rejects.toMatchObject({ code: "ai_failed" });
    expect(read).not.toHaveBeenCalled();
  });

  it("텍스트가 없는 null 출력은 실패한다", async () => {
    result().mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    await expect(call()).rejects.toMatchObject({ code: "ai_failed" });
  });

  it("SDK 파싱·API 예외를 변환하고 자체 재시도하지 않는다", async () => {
    result().mockRejectedValue(new Error("SDK failure"));
    await expect(call()).rejects.toMatchObject({ code: "ai_failed" });
    expect(result()).toHaveBeenCalledOnce();
  });
});

it("스트림 생성 중 동기 예외도 ai_failed로 바꾼다", async () => {
  sdk.stream.mockImplementation(() => { throw new Error("stream failure"); });
  await expect(writeReport(input)).rejects.toMatchObject({ code: "ai_failed" });
});

it("리포트 응답에 추가된 금액 필드를 허용하지 않는다", async () => {
  sdk.finalMessage.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { ...draft, amount: 4500 } });
  await expect(writeReport(input)).rejects.toMatchObject({ code: "ai_failed" });
});

it("응답 JSON 스키마에 금액 필드가 없고 금지된 요청 설정을 보내지 않는다", async () => {
  sdk.parse.mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: { mapping } })
    .mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: { classifications: [] } });
  sdk.finalMessage.mockResolvedValue({ stop_reason: "end_turn", parsed_output: draft });
  await mapColumns([]);
  await classifyMerchants([]);
  await writeReport(input);
  const requests = [...sdk.parse.mock.calls, ...sdk.stream.mock.calls].map(([request]) => request);
  for (const request of requests) {
    expect(request.output_config.format.type).toBe("json_schema");
    const schema = JSON.stringify(request.output_config.format.schema);
    expect(schema).not.toMatch(/"(?:amount|price|total|totalAmount|categoryTotals)"\s*:/i);
    for (const key of ["thinking", "temperature", "top_p", "top_k", "output_format"]) {
      expect(request).not.toHaveProperty(key);
    }
    expect(JSON.stringify(request)).not.toContain("cache_control");
    expect(request.messages.at(-1).role).toBe("user");
  }
  const reportSchema = JSON.stringify(requests[2].output_config.format.schema);
  expect(reportSchema).toContain('"transactionIds"');
  expect(reportSchema).toContain('"transactionId"');
});
