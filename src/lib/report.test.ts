import { expect, it } from "vitest";
import type { StoredReportInsights, StoredReportTotals } from "@/types";
import { restoreInsights, restoreTotals } from "./report";

it("jsonb에 문자열로 저장된 합계를 정밀도 손실 없이 bigint로 되돌린다", () => {
  const stored = { totalAmount: "9007199254740993", categoryTotals: { 식비: "9007199254740993", 교통: "-100" } } as StoredReportTotals;
  expect(restoreTotals(stored)).toEqual({
    totalAmount: 9007199254740993n,
    categoryTotals: { 식비: 9007199254740993n, 교통: -100n },
  });
});

it("인사이트의 거래 금액만 bigint로 되돌리고 날짜·가맹점·문장은 그대로 둔다", () => {
  const stored: StoredReportInsights = {
    summary: "구독이 많아요",
    recurring: [{ transactions: [{ id: 3, occurredOn: "2026-10-03", merchant: "영상 구독", amount: "17000", category: "구독·정기결제" }], note: "매달 반복돼요" }],
    anomalies: [{ transaction: { id: 4, occurredOn: "2026-10-04", merchant: "환불", amount: "-1000" }, reason: "환불이 있어요" }],
    savingTips: [{ title: "구독 확인", detail: "안 쓰는 구독이 있어요" }],
  };
  expect(restoreInsights(stored)).toEqual({
    summary: "구독이 많아요",
    recurring: [{ transactions: [{ id: 3, occurredOn: "2026-10-03", merchant: "영상 구독", amount: 17000n, category: "구독·정기결제" }], note: "매달 반복돼요" }],
    anomalies: [{ transaction: { id: 4, occurredOn: "2026-10-04", merchant: "환불", amount: -1000n }, reason: "환불이 있어요" }],
    savingTips: [{ title: "구독 확인", detail: "안 쓰는 구독이 있어요" }],
  });
});
