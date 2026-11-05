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
