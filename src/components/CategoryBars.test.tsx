import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryBars } from "./CategoryBars";

it("금액순 정렬, 0원 숨김, 전달받은 비율과 최대 금액 대비 막대 길이를 표시한다", () => {
  const rows = [{ label: "교통", amount: 100n, ratio: 33 }, { label: "교육", amount: 0n, ratio: 0 }, { label: "식비", amount: 200n, ratio: 67 }, { label: "쇼핑", amount: -10n, ratio: 0 }];
  const html = renderToStaticMarkup(<CategoryBars rows={rows} />);
  expect(html.indexOf("식비")).toBeLessThan(html.indexOf("교통"));
  expect(html).not.toContain("교육");
  expect(html).toContain("33%");
  expect(html).toContain('width:50%');
  expect(html).toContain('width:100%');
  const refund = html.slice(html.indexOf("쇼핑"));
  expect(refund).toContain("-10");
  expect(refund).not.toContain("bg-primary");
  expect(rows[0].label).toBe("교통");
});

it("전부 환불이거나 비어 있어도 막대 없이 표시한다", () => {
  expect(renderToStaticMarkup(<CategoryBars rows={[{ label: "쇼핑", amount: -9007199254740993n, ratio: 0 }]} />)).toContain("-9,007,199,254,740,993");
  expect(renderToStaticMarkup(<CategoryBars rows={[]} />)).not.toContain("width:");
});
