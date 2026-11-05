import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MonthlyChart } from "./MonthlyChart";

it("최근 12개월을 최신 순서로 표시하고 음수에는 막대를 그리지 않는다", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, total: 100n }));
  const html = renderToStaticMarkup(<MonthlyChart rows={[{ month: "2025-12", total: 999n }, ...rows, { month: "2027-01", total: -500n }]} />);
  expect(html).toContain("2027년 1월");
  expect(html.indexOf("2027년 1월")).toBeLessThan(html.indexOf("2026년 12월"));
  expect(html).not.toContain("2026년 1월");
  expect(html).not.toContain("2025년");
  expect(html).toContain("-500");
  expect(html.match(/bg-primary/g)).toHaveLength(11);
  expect(html).toContain("width:100%");
});

it("큰 원화 정수를 손실 없이 표시한다", () => {
  expect(renderToStaticMarkup(<MonthlyChart rows={[{ month: "2026-10", total: 9007199254740993n }]} />)).toContain("9,007,199,254,740,993");
});
