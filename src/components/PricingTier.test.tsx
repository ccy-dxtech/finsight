import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingTier } from "./PricingTier";

it("무료 플랜의 한도와 월별 추이 제한을 표시한다", () => {
  const html = renderToStaticMarkup(<PricingTier tier="free" priceLabel="0원" />);
  expect(html).toContain("무료");
  expect(html).toContain("0원");
  expect(html).toContain("월 3회 분석");
  expect(html).toContain("핵심 리포트");
  expect(html).toContain("월별 추이 미포함");
  expect(html).toContain('href="/login"');
  expect(html).not.toContain('href="/api/checkout"');
});

it("프로 가격 prop과 혜택, 결제 링크 바로 아래 테스트 안내를 표시한다", () => {
  const html = renderToStaticMarkup(<PricingTier tier="pro" priceLabel="월 2,000원" />);
  expect(html).toContain("프로");
  expect(html).toContain("월 2,000원");
  expect(html).toContain("월 30회 분석");
  expect(html).toContain("더 깊은 분석");
  expect(html).toContain("월별 추이와 카테고리 증감");
  expect(html).toContain('href="/api/checkout"');
  expect(html).toMatch(/프로 구독하기<\/a><p[^>]*>테스트 결제 환경이며 실제로 청구되지 않습니다<\/p>/);
});
