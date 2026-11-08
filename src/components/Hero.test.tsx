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

it("시작하기 바로 아래 캡션으로 저장하지 않는 것과 무료 횟수를 알린다", () => {
  const html = renderToStaticMarkup(<Hero isLoggedIn={false} />);
  const cta = html.indexOf("시작하기</a>");
  expect(cta).toBeGreaterThan(-1);
  expect(html.indexOf("원본 파일은 저장하지 않아요. 날짜·가맹점·금액만 남겨요.")).toBeGreaterThan(cta);
  expect(html.indexOf("무료로 매달 3회 분석할 수 있어요.")).toBeGreaterThan(cta);
  expect(html).not.toContain("AI에 아무것도 보내지 않아요");
});

it("넓은 화면용 장식 그림은 토큰 색만 쓰고 보조기술에서 숨긴다", () => {
  const html = renderToStaticMarkup(<Hero isLoggedIn={false} />);
  const svgs = html.match(/<svg[^>]*>/g) ?? [];
  for (const svg of svgs) expect(svg).toContain('aria-hidden="true"');
  expect(svgs.some((svg) => /class="[^"]*\bhidden\b[^"]*\bxl:block\b/.test(svg))).toBe(true);
  expect(html).toContain("fill-primary");
  expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b|gradient|<img/);
});
