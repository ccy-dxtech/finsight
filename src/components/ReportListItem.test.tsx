import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportListItem } from "./ReportListItem";

it("파일명과 기간, KST 생성일, 원화 금액을 상세 링크에 표시한다", () => {
  const html = renderToStaticMarkup(<ReportListItem id="report" fileName="명세서.xlsx" periodStart="2026-10-01" periodEnd="2026-10-31" totalAmount={12500n} createdAt="2026-11-01T00:00:00Z" />);
  expect(html).toContain('href="/dashboard/reports/report"');
  expect(html).toContain("명세서.xlsx");
  expect(html).toContain("10.01–10.31");
  expect(html).toContain("2026.11.01");
  expect(html).toMatch(/12,500<span[^>]*>원<\/span>/);
  expect(html).toContain("tabular-nums");
});
