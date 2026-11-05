import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StepList } from "./StepList";

it("로그인, 업로드, 리포트 확인을 순서 있는 세 단계로 표시한다", () => {
  const html = renderToStaticMarkup(<StepList />);
  expect(html).toContain("<ol");
  expect(html.match(/<li[ >]/g)).toHaveLength(3);
  expect(html.indexOf("Google로 로그인")).toBeLessThan(html.indexOf("명세서 업로드"));
  expect(html.indexOf("명세서 업로드")).toBeLessThan(html.indexOf("AI 리포트 확인"));
});
