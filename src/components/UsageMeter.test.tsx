import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UsageMeter } from "./UsageMeter";

it("사용량이 아닌 남은 양을 접근 가능한 meter로 표시한다", () => {
  const html = renderToStaticMarkup(<UsageMeter used={1} limit={3} />);
  expect(html).toContain('role="meter"');
  expect(html).toContain('aria-valuenow="2"');
  expect(html).toContain('aria-valuemax="3"');
  expect(html).toContain("매월 1일 00:00(KST)");
});

it("한도를 넘겨도 0회로 표시하고, 소진 안내는 업로드 영역 카드에 맡겨 초기화 안내만 둔다", () => {
  const html = renderToStaticMarkup(<UsageMeter used={4} limit={3} />);
  expect(html).toContain('aria-valuenow="0"');
  expect(html).toContain("매월 1일 00:00(KST)");
  expect(html).not.toContain("<a");
  expect(html).not.toContain("모두 사용했어요");
});
