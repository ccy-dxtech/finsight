import { expect, it } from "vitest";
import { formatAmount, formatDate, formatPeriod } from "./format";

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
