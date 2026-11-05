import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatSummary } from "./StatSummary";

it("저장된 큰 정수 금액, 건수, 기간과 0건인 제외도 표시한다", () => {
  const html = renderToStaticMarkup(<StatSummary totalAmount={9007199254740993n} transactionCount={182} periodStart="2026-10-01" periodEnd="2026-10-31" excludedCount={0} />);
  expect(html).toContain("9,007,199,254,740,993");
  expect(html).toContain("182");
  expect(html).toContain("10.01–10.31");
  expect(html).toMatch(/제외<\/dt><dd[^>]*>0<span[^>]*>건/);
});
