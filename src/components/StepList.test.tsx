import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StepList } from "./StepList";

it("로그인, 명세서 올리기, 리포트 확인을 순서 있는 세 단계로 표시한다", () => {
  const html = renderToStaticMarkup(<StepList />);
  expect(html).toContain("<ol");
  expect(html.match(/<li[ >]/g)).toHaveLength(3);
  expect(html.indexOf("Google로 로그인")).toBeLessThan(html.indexOf("명세서 올리기"));
  expect(html.indexOf("명세서 올리기")).toBeLessThan(html.indexOf("AI 리포트 확인"));
});

it("화면 문구에 '업로드' 대신 용어표의 '올리기'를 쓴다", () => {
  const html = renderToStaticMarkup(<StepList />);
  expect(html).not.toContain("업로드");
});
