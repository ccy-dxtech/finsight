import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import NotFound from "./not-found";

it("영어 기본 404 대신 한국어 안내와 대시보드로 가기를 보여준다", () => {
  const html = renderToStaticMarkup(<NotFound />);
  expect(html).toMatch(/<h1[^>]*>페이지를 찾을 수 없어요<\/h1>/);
  expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>대시보드로 가기<\/a>/);
  expect(html).not.toMatch(/404|could not be found/i);
});
