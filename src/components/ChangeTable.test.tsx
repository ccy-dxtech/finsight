import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeTable } from "./ChangeTable";

it("전달된 증감을 기호·부호와 글자색으로 표시하고 표 스크롤을 허용한다", () => {
  const html = renderToStaticMarkup(<ChangeTable rows={[
    { category: "식비", last: 468000n, current: 512300n, diff: 44300n },
    { category: "쇼핑", last: 402000n, current: 331500n, diff: -70500n },
    { category: "교통", last: 100n, current: 100n, diff: 0n },
  ]} />);
  expect(html).toContain("지난달");
  expect(html).toContain("이번 달");
  expect(html).toContain("▲ +44,300");
  expect(html).toContain("▼ −70,500");
  expect(html).toMatch(/text-muted[^>]*>0<span/);
  expect(html).toContain("text-change-up");
  expect(html).toContain("text-change-down");
  expect(html).toContain("overflow-x-auto");
  expect(html).toContain('scope="col"');
});
