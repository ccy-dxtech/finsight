import { expect, it } from "vitest";
import { formatAmount, formatDate, formatMonth, formatNumber, formatPeriod } from "./format";

// 화면은 "원"을 숫자보다 작게 따로 붙이므로 단위 없는 숫자가 필요하다.
it("원 단위 bigint를 단위 없이 천 단위 쉼표로만 표시한다", () => {
  expect(formatNumber(12500n)).toBe("12,500");
  expect(formatNumber(-12500n)).toBe("-12,500");
  expect(formatNumber(0n)).toBe("0");
  expect(formatNumber(9007199254740993n)).toBe("9,007,199,254,740,993");
});

it("YYYY-MM 달을 한국어 연월로 표시한다", () => {
  expect(formatMonth("2026-09")).toBe("2026년 9월");
  expect(formatMonth("2027-01")).toBe("2027년 1월");
  expect(formatMonth("2026-12")).toBe("2026년 12월");
});

it("원 단위 bigint를 정밀도 손실 없이 표시한다", () => {
  expect(formatAmount(12500n)).toBe("12,500원");
  expect(formatAmount(-12500n)).toBe("-12,500원");
  expect(formatAmount(9007199254740993n)).toBe("9,007,199,254,740,993원");
});

it("날짜와 기간을 한국어 화면 형식으로 표시한다", () => {
  expect(formatDate("2026-10-03")).toBe("2026.10.03");
  expect(formatDate("2026-10-02T16:00:00Z")).toBe("2026.10.03");
  expect(formatPeriod("2026-10-01", "2026-10-31")).toBe("10.01–10.31");
});
