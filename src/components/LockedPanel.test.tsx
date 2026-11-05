import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LockedPanel } from "./LockedPanel";

it("잠금 아이콘과 결제 안내만 표시한다", () => {
  const html = renderToStaticMarkup(<LockedPanel />);
  expect(html).toContain("lucide-lock");
  expect(html).toContain("프로 전용");
  expect(html).toContain('href="/api/checkout"');
  expect(html).toContain("프로 구독하기");
  expect(html).toContain("테스트 결제 환경이며 실제로 청구되지 않습니다");
  expect(html).not.toMatch(/blur|<table|bg-primary-muted/);
});
