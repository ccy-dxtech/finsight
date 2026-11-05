import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsRow } from "./SettingsRow";
import { Button } from "./Button";

it("제목·설명·액션을 표시하고 위험 색은 삭제 버튼에만 둔다", () => {
  const html = renderToStaticMarkup(<SettingsRow title="내 데이터 전체 삭제" description="거래와 리포트를 지워요." variant="danger" action={<Button variant="danger">전체 삭제</Button>} />);
  expect(html).toContain("거래와 리포트를 지워요.");
  expect(html).toMatch(/text-ink[^>]*>내 데이터 전체 삭제/);
  expect(html).toMatch(/<button[^>]*text-danger/);
});
