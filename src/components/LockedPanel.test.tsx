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

it("무료가 횟수를 다 쓰면 같은 카드 형식으로 바로 결제로 보낸다", () => {
  const html = renderToStaticMarkup(<LockedPanel reason="quota" plan="free" />);
  expect(html).toMatch(/<h2[^>]*>이번 달 분석 3회를 모두 썼어요<\/h2>/);
  expect(html).toContain("프로는 매달 30회까지 분석하고 월별 추이도 볼 수 있어요.");
  expect(html).toMatch(/<a[^>]*href="\/api\/checkout"[^>]*>프로 구독하기<\/a>/);
  expect(html).toContain("테스트 결제 환경이며 실제로 청구되지 않습니다");
  expect(html).not.toContain("프로 전용");
});

it("프로가 횟수를 다 쓰면 업그레이드 없이 다시 채워지는 때만 알린다", () => {
  const html = renderToStaticMarkup(<LockedPanel reason="quota" plan="pro" />);
  expect(html).toMatch(/<h2[^>]*>이번 달 분석 30회를 모두 썼어요<\/h2>/);
  expect(html).toContain("다음 달 1일 00:00(KST)에 다시 채워져요.");
  expect(html).not.toContain("/api/checkout");
  expect(html).not.toContain("프로 구독하기");
  expect(html).not.toContain("테스트 결제 환경");
});
