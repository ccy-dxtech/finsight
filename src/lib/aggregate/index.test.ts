import { expect, it } from "vitest";
import { categoryChanges, monthlyTotals, sumByCategory, summarize } from "./index";

it("공개 함수로 거래 합계와 월별 증감을 계산한다", () => {
  const txns = [{ id: 1, occurredOn: "2026-10-01", merchant: "가게", amount: 10n }];
  expect(sumByCategory(txns)).toEqual([{ category: "기타", total: 10n, ratio: 100 }]);
  expect(summarize(txns).totalAmount).toBe(10n);
  expect(monthlyTotals(txns)).toEqual([{ month: "2026-10", total: 10n }]);
  expect(categoryChanges(txns, "2026-10", "2026-09"))
    .toEqual([{ category: "기타", last: 0n, current: 10n, diff: 10n }]);
});
