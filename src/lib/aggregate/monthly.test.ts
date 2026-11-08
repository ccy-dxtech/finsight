import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types";
import { categoryChanges, latestMonthChanges, monthlyTotals } from "./monthly";

const txn = (occurredOn: string, amount: bigint, category?: Transaction["category"]): Transaction => ({
  id: 1, occurredOn, merchant: "가게", amount, category,
});

describe("monthlyTotals", () => {
  it("KST 날짜의 월·연도 경계를 그대로 쓰고 환불을 상계해 최신순으로 반환한다", () => {
    const txns = [txn("2026-12-31", 100n), txn("2027-01-01", 50n),
      txn("2026-12-01", -120n), txn("2026-11-30", 10n)];
    const original = structuredClone(txns);
    expect(monthlyTotals(txns)).toEqual([
      { month: "2027-01", total: 50n }, { month: "2026-12", total: -20n },
      { month: "2026-11", total: 10n },
    ]);
    expect(txns).toEqual(original);
  });

  it("12개월을 넘으면 최신 12개월만 반환한다", () => {
    const txns = [txn("2025-12-31", 999n), ...Array.from({ length: 12 }, (_, i) =>
      txn(`2026-${String(i + 1).padStart(2, "0")}-01`, BigInt(i + 1)))];
    expect(monthlyTotals(txns)).toEqual([
      { month: "2026-12", total: 12n }, { month: "2026-11", total: 11n },
      { month: "2026-10", total: 10n }, { month: "2026-09", total: 9n },
      { month: "2026-08", total: 8n }, { month: "2026-07", total: 7n },
      { month: "2026-06", total: 6n }, { month: "2026-05", total: 5n },
      { month: "2026-04", total: 4n }, { month: "2026-03", total: 3n },
      { month: "2026-02", total: 2n }, { month: "2026-01", total: 1n },
    ]);
  });

  it("빈 입력은 빈 목록이고 상계된 월도 0원으로 남긴다", () => {
    expect(monthlyTotals([])).toEqual([]);
    expect(monthlyTotals([txn("2026-10-01", 9007199254740993n), txn("2026-10-31", -9007199254740993n)]))
      .toEqual([{ month: "2026-10", total: 0n }]);
  });
});

describe("categoryChanges", () => {
  it("지정한 두 달만 비교하며 한쪽 달에만 있는 카테고리도 포함한다", () => {
    const txns = [
      txn("2026-12-31", 100n, "식비"), txn("2027-01-01", 50n, "식비"),
      txn("2027-01-31", -10n, "식비"), txn("2026-12-01", 30n, "교통"),
      txn("2027-01-01", -20n, "쇼핑"), txn("2026-11-30", 999n, "교육"),
    ];
    const original = structuredClone(txns);
    expect(categoryChanges(txns, "2027-01", "2026-12")).toEqual([
      { category: "식비", last: 100n, current: 40n, diff: -60n },
      { category: "교통", last: 30n, current: 0n, diff: -30n },
      { category: "쇼핑", last: 0n, current: -20n, diff: -20n },
    ]);
    expect(txns).toEqual(original);
  });

  it("빈 입력이나 해당 월 거래가 없으면 빈 목록이다", () => {
    expect(categoryChanges([], "2026-10", "2026-09")).toEqual([]);
    expect(categoryChanges([txn("2026-08-01", 1n)], "2026-10", "2026-09")).toEqual([]);
  });
});

describe("latestMonthChanges", () => {
  it("오늘 날짜가 아니라 거래가 있는 가장 최근 달과 그 전달을 비교한다", () => {
    const txns = [
      txn("2026-08-15", 999n, "교육"), txn("2026-09-03", 100n, "식비"),
      txn("2026-10-02", 44300n, "식비"), txn("2026-10-20", 100n, "식비"), txn("2026-10-05", 30n, "교통"),
    ];
    expect(latestMonthChanges(txns)).toEqual({
      currentMonth: "2026-10", previousMonth: "2026-09",
      rows: [
        { category: "식비", last: 100n, current: 44400n, diff: 44300n },
        { category: "교통", last: 0n, current: 30n, diff: 30n },
      ],
    });
  });

  it("1월의 전달은 지난해 12월이다", () => {
    expect(latestMonthChanges([txn("2026-12-31", 10n, "식비"), txn("2027-01-01", 15n, "식비")])).toEqual({
      currentMonth: "2027-01", previousMonth: "2026-12",
      rows: [{ category: "식비", last: 10n, current: 15n, diff: 5n }],
    });
  });

  it("전달 거래가 없으면 0원과 비교한 증가로 보이지 않게 빈 목록을 준다", () => {
    expect(latestMonthChanges([txn("2026-10-02", 100n, "식비"), txn("2026-08-02", 50n, "식비")]))
      .toEqual({ currentMonth: "2026-10", previousMonth: "2026-09", rows: [] });
  });

  it("거래가 없으면 null이다", () => {
    expect(latestMonthChanges([])).toBeNull();
  });

  it("미분류·상계된 카테고리와 큰 정수 증감을 유지한다", () => {
    expect(categoryChanges([
      txn("2026-09-30", -9007199254740993n), txn("2026-10-01", 1n),
      txn("2026-10-02", 10n, "식비"), txn("2026-10-03", -10n, "식비"),
    ], "2026-10", "2026-09")).toEqual([
      { category: "식비", last: 0n, current: 0n, diff: 0n },
      { category: "기타", last: -9007199254740993n, current: 1n, diff: 9007199254740994n },
    ]);
  });
});
