import { describe, expect, it } from "vitest";
import { maskTopRows } from "./mask";

describe("maskTopRows", () => {
  it("6자리 이상 숫자만 마스킹하고 원본은 바꾸지 않는다", () => {
    const rows = [["123456", "카드1234567890123456", "GS25", "12345", "123456-654321"]];
    expect(maskTopRows(rows)).toEqual([
      ["******", "카드****************", "GS25", "12345", "******-******"],
    ]);
    expect(rows[0][0]).toBe("123456");
  });

  it("기본으로 상단 10행만 반환한다", () => {
    const rows = Array.from({ length: 12 }, (_, i) => [String(i)]);
    expect(maskTopRows(rows)).toEqual(rows.slice(0, 10));
  });

  it("지정한 행 수만 반환한다", () => {
    expect(maskTopRows([["a"], ["b"]], 1)).toEqual([["a"]]);
    expect(maskTopRows([["a"]], 0)).toEqual([]);
  });
});
