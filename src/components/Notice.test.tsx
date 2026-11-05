import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Notice } from "./Notice";

it("결제 확인 중 안내를 status로 표시한다", () => {
  const html = renderToStaticMarkup(<Notice><strong>결제 확인 중이에요.</strong> 잠시 뒤 새로고침해 주세요.</Notice>);
  expect(html).toContain('role="status"');
  expect(html).toContain("<strong>결제 확인 중이에요.</strong>");
  expect(html).toContain("잠시 뒤 새로고침해 주세요.");
  expect(html).toContain("lucide-info");
});

it("결제 완료 안내를 status와 성공 아이콘으로 표시한다", () => {
  const html = renderToStaticMarkup(<Notice variant="success"><strong>프로가 시작됐어요.</strong> 이번 달 30회까지 분석할 수 있어요.</Notice>);
  expect(html).toContain('role="status"');
  expect(html).toContain("프로가 시작됐어요.");
  expect(html).toContain("bg-primary-soft");
  expect(html).toContain("lucide-circle-check");
});

it("오류 안내를 alert로 표시하고 children의 문구 순서와 강조를 유지한다", () => {
  const html = renderToStaticMarkup(<Notice variant="error"><strong>열을 찾지 못했어요.</strong> 원본 파일인지 확인해 주세요. 횟수는 차감되지 않았어요.</Notice>);
  expect(html).toContain('role="alert"');
  expect(html).toContain("<strong>열을 찾지 못했어요.</strong> 원본 파일인지 확인해 주세요. 횟수는 차감되지 않았어요.");
  expect(html).toContain("bg-danger-soft");
  expect(html).toContain("lucide-circle-alert");
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('stroke-width="1.5"');
});
