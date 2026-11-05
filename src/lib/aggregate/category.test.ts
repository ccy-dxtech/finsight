import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types";
import { sumByCategory } from "./category";

const txn = (amount: bigint, category?: Transaction["category"]): Transaction => ({
  id: 1, occurredOn: "2026-10-03", merchant: "가게", amount, category,
});

describe("sumByCategory", () => {
  it("환불을 상계하고 양수 합계 기준 정수 비율과 금액 내림차순을 반환한다", () => {
    expect(sumByCategory([
      txn(50n, "식비"), txn(-25n, "식비"), txn(175n, "쇼핑"),
      txn(10n, "교통"), txn(-30n, "교통"), txn(10n, "교육"), txn(-10n, "교육"),
    ])).toEqual([
      { category: "쇼핑", total: 175n, ratio: 88 },
      { category: "식비", total: 25n, ratio: 13 },
      { category: "교통", total: -20n, ratio: 0 },
    ]);
  });

  it("양수 합계가 없으면 음수 항목의 비율은 0이다", () => {
    expect(sumByCategory([txn(-10n, "식비"), txn(-20n, "쇼핑")])).toEqual([
      { category: "식비", total: -10n, ratio: 0 },
      { category: "쇼핑", total: -20n, ratio: 0 },
    ]);
  });

  it("빈 입력과 0원 카테고리는 빈 목록을 반환한다", () => {
    expect(sumByCategory([])).toEqual([]);
    expect(sumByCategory([txn(0n, "식비")])).toEqual([]);
  });

  it("미분류 거래를 기타에 포함하고 입력을 변경하지 않는다", () => {
    const txns = [txn(1n), txn(2n, "기타")];
    const original = structuredClone(txns);
    expect(sumByCategory(txns)).toEqual([{ category: "기타", total: 3n, ratio: 100 }]);
    expect(txns).toEqual(original);
  });

  it("Number 안전 범위를 넘는 합계와 반올림 경계를 정확히 계산한다", () => {
    expect(sumByCategory([txn(9007199254740993n, "식비"), txn(9007199254740994n, "쇼핑")]))
      .toEqual([
        { category: "쇼핑", total: 9007199254740994n, ratio: 50 },
        { category: "식비", total: 9007199254740993n, ratio: 50 },
      ]);
    expect(sumByCategory([txn(1n, "식비"), txn(199n, "쇼핑")]))
      .toEqual([
        { category: "쇼핑", total: 199n, ratio: 100 },
        { category: "식비", total: 1n, ratio: 1 },
      ]);
  });
});
