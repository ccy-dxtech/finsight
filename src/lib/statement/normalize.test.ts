import { describe, expect, it } from "vitest";
import { normalizeRows } from "./normalize";
import { StatementError } from "./parse";

const mapping = { headerRowIndex: 1, dateCol: 0, merchantCol: 2, amountCol: 3 };
const header = [["명세서"], ["날짜", "카드번호", "가맹점", "금액", "이름"]];

describe("normalizeRows", () => {
  it("헤더 아래에서 세 열만 반환하고 파일 행 번호를 id로 쓴다", () => {
    const rows = [...header,
      ["2026.10.03", "1234567890123456", " GS25 ", "12,500원", "이름"],
      ["잘못된 날짜", "비밀", "식당", "300"],
      ["2026-10-04", "비밀", "카페", "-2,500 원"],
    ];
    const original = structuredClone(rows);
    expect(normalizeRows(rows, mapping)).toEqual({
      transactions: [
        { id: 3, occurredOn: "2026-10-03", merchant: "GS25", amount: 12500n },
        { id: 5, occurredOn: "2026-10-04", merchant: "카페", amount: -2500n },
      ],
      excludedCount: 1,
    });
    expect(rows).toEqual(original);
  });

  it.each([
    ["2026.10.03", "2026-10-03"], ["2026-10-03", "2026-10-03"],
    ["20261003", "2026-10-03"], ["46298", "2026-10-03"],
    ["46298.5", "2026-10-03"], ["2024/2/29", "2024-02-29"],
    ["1", "1900-01-01"], ["61", "1900-03-01"],
  ])("날짜 %s를 %s로 정규화한다", (date, expected) => {
    expect(normalizeRows([...header, [date, "", "가게", "0"]], mapping).transactions[0].occurredOn)
      .toBe(expected);
  });

  it("안전한 Number 범위를 넘는 원화 정수도 정확하게 보존한다", () => {
    expect(normalizeRows([...header, ["20261003", "", "가게", "9,007,199,254,740,993원"]], mapping)
      .transactions[0].amount).toBe(9007199254740993n);
  });

  it.each([
    ["2026-02-29", "가게", "1"], ["2026-04-31", "가게", "1"],
    ["2026-13-01", "가게", "1"], ["2026-00-01", "가게", "1"],
    ["60", "가게", "1"], ["", "가게", "1"],
    ["20261003", "가게", ""], ["20261003", "가게", "1.5"],
    ["20261003", "가게", "1e3"], ["20261003", "가게", "금액없음"],
    ["20261003", "   ", "1"],
  ])("읽을 수 없는 행 %s / %s / %s를 제외한다", (date, merchant, amount) => {
    const rows = [...header, [date, "", merchant, amount], ["20261003", "", "가게", "1"]];
    const result = normalizeRows(rows, mapping);
    expect(result.excludedCount).toBe(1);
    expect(result.transactions).toEqual([
      { id: 4, occurredOn: "2026-10-03", merchant: "가게", amount: 1n },
    ]);
  });

  it("짧은 행과 빈 행도 제외 건수에 포함한다", () => {
    const result = normalizeRows([...header, [], ["20261003"], ["20261003", "", "가게", "1"]], mapping);
    expect(result.excludedCount).toBe(2);
  });

  it.each([
    { rows: header },
    { rows: [...header, ["날짜없음", "", "가게", ""]] },
  ])("거래가 0건이면 거절한다", ({ rows }) => {
    expect(() => normalizeRows(rows, mapping)).toThrow(new StatementError("no_transactions"));
  });

  it("유효 거래 3,000건을 허용하고 3,001건은 거절한다", () => {
    const rows = [...header, ...Array.from({ length: 3000 }, () => ["20261003", "", "가게", "1"])];
    expect(normalizeRows([...rows, []], mapping).transactions).toHaveLength(3000);
    expect(() => normalizeRows([...rows, ["20261003", "", "가게", "1"]], mapping))
      .toThrow(new StatementError("too_many_rows"));
  });
});
