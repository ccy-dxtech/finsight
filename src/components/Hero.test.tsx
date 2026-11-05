import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Hero } from "./Hero";

it.each([
  [false, "/login", "시작하기"],
  [true, "/dashboard", "대시보드로 가기"],
] as const)("로그인 상태 %s에 맞는 주요 링크 하나를 표시한다", (isLoggedIn, href, label) => {
  const html = renderToStaticMarkup(<Hero isLoggedIn={isLoggedIn} />);
  expect(html).toContain(`href="${href}"`);
  expect(html).toContain(label);
  expect(html.match(/<a /g)).toHaveLength(1);
  expect(html).toContain("text-left");
  expect(html).not.toContain("text-center");
  expect(html).toContain("카드 명세서만 올리면,");
});
