import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { decodeCsv, parseStatement, maskTopRows, normalizeRows, dedupeKey, pickNewTransactions, StatementError } from "./index";
import { CARD_A_EXPECTED, CARD_B_EXPECTED } from "../../../tests/e2e/support/statement";

it("공개 함수로 CSV를 읽고 정규화한 뒤 기존 거래를 제외한다", async () => {
  const buffer = new TextEncoder().encode("날짜,가맹점,금액\n20261003,GS25,12500\n20261003,GS25,12500").buffer;
  expect(decodeCsv(buffer)).toContain("가맹점");
  const rows = await parseStatement(buffer, "카드.csv");
  expect(maskTopRows(rows)[1][0]).toBe("********");
  const { transactions } = normalizeRows(rows, { headerRowIndex: 0, dateCol: 0, merchantCol: 1, amountCol: 2 });
  expect(pickNewTransactions(transactions, new Set())).toHaveLength(2);
  expect(pickNewTransactions(transactions, new Set([dedupeKey(transactions[0])]))).toEqual([]);
  expect(() => normalizeRows([], { headerRowIndex: 0, dateCol: 0, merchantCol: 1, amountCol: 2 }))
    .toThrow(new StatementError("no_transactions"));
});

// 열 매핑은 AI(Haiku)가 하므로, 사람이 PDF를 보고 고른 매핑을 넣어 그 뒤 단계가 손으로 계산한 값과 같은지 본다.
it.each([
  { file: "card-a-history.pdf", mapping: { headerRowIndex: 0, dateCol: 0, merchantCol: 3, amountCol: 4 }, expected: CARD_A_EXPECTED, count: 18, excluded: 2 },
  { file: "card-b-statement.pdf", mapping: { headerRowIndex: 3, dateCol: 1, merchantCol: 0, amountCol: 2 }, expected: CARD_B_EXPECTED, count: 20, excluded: 1 },
])("테스트 PDF($file)를 읽어 정규화하면 손으로 계산한 합계·건수·제외 건수와 같다", async ({ file, mapping, expected, count, excluded }) => {
  const bytes = readFileSync(new URL(`../../../tests/fixtures/pdf/${file}`, import.meta.url));
  const rows = await parseStatement(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), file);
  // 열 매핑에는 상단 10행만 가므로 머리행이 그 안에 있어야 한다.
  expect(maskTopRows(rows)[mapping.headerRowIndex][mapping.amountCol]).toMatch(/이용금액/);
  expect(maskTopRows(rows).flat().join()).not.toMatch(/\d{6,}/);

  const { transactions, excludedCount } = normalizeRows(rows, mapping);
  expect(transactions).toHaveLength(count);
  expect(transactions.reduce((sum, txn) => sum + txn.amount, 0n)).toBe(BigInt(expected.totalAmount));
  expect(excludedCount).toBe(excluded);
});
