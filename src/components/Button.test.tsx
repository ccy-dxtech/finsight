import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./Button";

it("Google 로그인 문구와 큰 버튼을 렌더링한다", () => {
  const html = renderToStaticMarkup(<Button>Google 계정으로 로그인</Button>);
  expect(html).toContain("Google 계정으로 로그인");
  expect(html).toContain('type="button"');
  expect(html).toContain("h-14");
});

it("비활성 상태를 실제 버튼에 반영한다", () => {
  expect(renderToStaticMarkup(<Button disabled>Google 계정으로 로그인</Button>)).toContain('disabled=""');
});

it.each([
  ["primary", "bg-primary"],
  ["secondary", "bg-surface-strong"],
  ["text", "text-primary"],
  ["google", "border-border-strong"],
  ["danger", "border-danger"],
] as const)("%s 변형을 렌더링한다", (variant, token) => {
  const html = renderToStaticMarkup(<Button variant={variant}>동작</Button>);
  expect(html).toContain(token);
  expect(html).not.toContain('variant=');
});

it("보통 크기와 큰 크기를 지원한다", () => {
  expect(renderToStaticMarkup(<Button size="md">시작하기</Button>)).toContain("h-11");
  expect(renderToStaticMarkup(<Button size="lg">시작하기</Button>)).toContain("h-14");
});

it("주요 버튼에 눌림과 비활성 색을 적용한다", () => {
  const html = renderToStaticMarkup(<Button variant="primary" disabled>분석 중</Button>);
  expect(html).toContain("enabled:active:bg-primary-active");
  expect(html).toContain("disabled:bg-primary-disabled");
});

it("href가 있으면 링크로 렌더링한다", () => {
  const html = renderToStaticMarkup(<Button href="/dashboard" variant="secondary" aria-label="대시보드로 이동">대시보드로 가기</Button>);
  expect(html).toMatch(/^<a /);
  expect(html).toContain('href="/dashboard"');
  expect(html).toContain('aria-label="대시보드로 이동"');
  expect(html).not.toContain('type="button"');
});

it("비활성 링크는 이동 주소와 탭 포커스를 제거한다", () => {
  const html = renderToStaticMarkup(<Button href="/api/checkout" disabled>프로 구독하기</Button>);
  expect(html).toContain('role="link"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('tabindex="-1"');
  expect(html).not.toContain('href=');
});

it("버튼 type과 사용자 클래스를 유지한다", () => {
  const html = renderToStaticMarkup(<Button type="submit" className="mt-4">파일 올리기</Button>);
  expect(html).toContain('type="submit"');
  expect(html).toContain("mt-4");
});
