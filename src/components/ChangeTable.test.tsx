import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeTable } from "./ChangeTable";

it("전달된 증감을 기호·부호와 글자색으로 표시하고 표 스크롤을 허용한다", () => {
  const html = renderToStaticMarkup(<ChangeTable currentMonth="2026-10" previousMonth="2026-09" rows={[
    { category: "식비", last: 468000n, current: 512300n, diff: 44300n },
    { category: "쇼핑", last: 402000n, current: 331500n, diff: -70500n },
    { category: "교통", last: 100n, current: 100n, diff: 0n },
  ]} />);
  expect(html).toContain("▲ +44,300");
  expect(html).toContain("▼ −70,500");
  expect(html).toMatch(/text-muted[^>]*>0<span/);
  expect(html).toContain("text-change-up");
  expect(html).toContain("text-change-down");
  expect(html).toContain("overflow-x-auto");
  expect(html).toContain('scope="col"');
});

it("표 머리에 비교하는 실제 달을 전달, 최근 달 순서로 적는다", () => {
  const html = renderToStaticMarkup(<ChangeTable currentMonth="2027-01" previousMonth="2026-12" rows={[
    { category: "식비", last: 10n, current: 15n, diff: 5n },
  ]} />);
  expect(html).toMatch(/<thead>.*카테고리.*2026년 12월.*2027년 1월.*증감.*<\/thead>/);
  expect(html).toContain("카테고리별 2026년 12월과 2027년 1월 지출 비교");
  expect(html).not.toContain("지난달");
});

it("비교할 전달 거래가 없으면 표 대신 그달 명세서를 올리라고 안내한다", () => {
  const html = renderToStaticMarkup(<ChangeTable currentMonth="2026-10" previousMonth="2026-09" rows={[]} />);
  expect(html).not.toContain("<table");
  expect(html).toContain("2026년 9월 명세서를 올리면 카테고리별로 늘고 준 금액을 볼 수 있어요.");
  expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>명세서 올리기<\/a>/);
});
