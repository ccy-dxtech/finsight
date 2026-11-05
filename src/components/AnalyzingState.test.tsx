import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnalyzingState } from "./AnalyzingState";

it("진행 단계 없이 상태 문구와 느린 회전을 지원하는 스피너만 표시한다", () => {
  const html = renderToStaticMarkup(<AnalyzingState />);
  expect(html).toContain('role="status"');
  expect(html).toContain("분석 중이에요. 1~2분 걸릴 수 있어요");
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("motion-reduce:[animation-duration:2.4s]");
  expect(html).not.toMatch(/단계|퍼센트|%/);
});
