import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types";
import { summarize } from "./summary";

const txn = (occurredOn: string, amount: bigint): Transaction => ({
  id: 1, occurredOn, merchant: "가게", amount,
});

describe("summarize", () => {
  it("환불을 상계하고 모든 거래 건수와 최소·최대 날짜를 반환한다", () => {
    const txns = [txn("2026-11-01", 100n), txn("2026-10-01", -30n), txn("2026-12-31", 0n)];
    const original = structuredClone(txns);
    expect(summarize(txns)).toEqual({
      totalAmount: 70n, transactionCount: 3, periodStart: "2026-10-01", periodEnd: "2026-12-31",
    });
    expect(txns).toEqual(original);
  });

  it("빈 입력은 합계·건수 0과 null 기간을 반환한다", () => {
    expect(summarize([])).toEqual({
      totalAmount: 0n, transactionCount: 0, periodStart: null, periodEnd: null,
    });
  });

  it("하루치 환불만 있어도 음수 합계와 같은 시작·종료일을 반환한다", () => {
    expect(summarize([txn("2026-10-01", -9007199254740993n)])).toEqual({
      totalAmount: -9007199254740993n, transactionCount: 1,
      periodStart: "2026-10-01", periodEnd: "2026-10-01",
    });
  });
});
