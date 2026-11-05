import { expect, it } from "vitest";
import { decodeCsv, parseStatement, maskTopRows, normalizeRows, dedupeKey, pickNewTransactions, StatementError } from "./index";

it("공개 함수로 CSV를 읽고 정규화한 뒤 기존 거래를 제외한다", () => {
  const buffer = new TextEncoder().encode("날짜,가맹점,금액\n20261003,GS25,12500\n20261003,GS25,12500").buffer;
  expect(decodeCsv(buffer)).toContain("가맹점");
  const rows = parseStatement(buffer, "카드.csv");
  expect(maskTopRows(rows)[1][0]).toBe("********");
  const { transactions } = normalizeRows(rows, { headerRowIndex: 0, dateCol: 0, merchantCol: 1, amountCol: 2 });
  expect(pickNewTransactions(transactions, new Set())).toHaveLength(2);
  expect(pickNewTransactions(transactions, new Set([dedupeKey(transactions[0])]))).toEqual([]);
  expect(() => normalizeRows([], { headerRowIndex: 0, dateCol: 0, merchantCol: 1, amountCol: 2 }))
    .toThrow(new StatementError("no_transactions"));
});
