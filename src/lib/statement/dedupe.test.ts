import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types";
import { dedupeKey, pickNewTransactions } from "./dedupe";

const transaction: Transaction = { id: 2, occurredOn: "2026-10-03", merchant: "GS25", amount: 12500n };

describe("dedupeKey", () => {
  it("날짜·가맹점·금액만 키에 사용한다", () => {
    expect(dedupeKey(transaction)).toBe(dedupeKey({ ...transaction, id: 99, category: "쇼핑" }));
    for (const changed of [
      { ...transaction, occurredOn: "2026-10-04" },
      { ...transaction, merchant: "다른 가게" },
      { ...transaction, amount: -12500n },
    ]) expect(dedupeKey(changed)).not.toBe(dedupeKey(transaction));
  });
});

describe("pickNewTransactions", () => {
  it("이전 업로드에 같은 키가 있으면 제외한다", () => {
    const fresh = { ...transaction, id: 3, amount: 9007199254740993n };
    const keys = new Set([dedupeKey(transaction)]);
    expect(pickNewTransactions([transaction, fresh], keys)).toEqual([fresh]);
    expect(pickNewTransactions([transaction], keys)).toEqual([]);
    expect(keys.size).toBe(1);
  });

  it("같은 파일 안의 동일 거래는 모두 유지한다", () => {
    const file = [transaction, { ...transaction, id: 3 }];
    const keys = new Set<string>();
    expect(pickNewTransactions(file, keys)).toEqual(file);
    expect(file).toHaveLength(2);
    expect(keys.size).toBe(0);
  });
});
