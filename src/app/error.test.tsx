import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "./error";

it("오류 내용을 숨기고 한국어 안내와 다시 시도·대시보드로 가기를 보여준다", () => {
  const error = Object.assign(new Error("private database detail"), { digest: "digest-1" });
  const html = renderToStaticMarkup(<ErrorPage error={error} reset={vi.fn()} />);
  expect(html).toMatch(/<h1[^>]*>화면을 불러오지 못했어요<\/h1>/);
  expect(html).toMatch(/<button[^>]*type="button"[^>]*>다시 시도<\/button>/);
  expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*>대시보드로 가기<\/a>/);
  expect(html).not.toContain("private database detail");
  expect(html).not.toMatch(/Something went wrong|Try again|Error/);
});
