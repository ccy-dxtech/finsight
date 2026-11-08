import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingTier } from "./PricingTier";

const text = (html: string) => html.replace(/<[^>]+>/g, "");

it("무료 플랜의 한도와 월별 추이 제한을 표시한다", () => {
  const html = renderToStaticMarkup(<PricingTier tier="free" priceLabel="0원" />);
  expect(html).toContain("무료");
  expect(text(html)).toContain("0원");
  expect(html).toContain("월 3회 분석");
  expect(html).toContain("핵심 리포트");
  expect(html).toContain("월별 추이 미포함");
  expect(html).toContain('href="/login"');
  expect(html).not.toContain('href="/api/checkout"');
});

it("무료 시작하기 바로 아래에 결제 정보가 필요 없다는 캡션을 둔다", () => {
  const html = renderToStaticMarkup(<PricingTier tier="free" priceLabel="0원" />);
  expect(html).toMatch(/시작하기<\/a><p[^>]*>결제 정보 없이 바로 시작해요<\/p>/);
});

it("프로 가격 prop과 혜택, 결제 링크 바로 아래 테스트 안내를 표시한다", () => {
  const html = renderToStaticMarkup(<PricingTier tier="pro" priceLabel="월 2,000원" />);
  expect(html).toContain("프로");
  expect(text(html)).toContain("월 2,000원");
  expect(html).toContain("월 30회 분석");
  expect(html).toContain("더 깊은 분석");
  expect(html).toContain("월별 추이와 카테고리 증감");
  expect(html).toContain('href="/api/checkout"');
  expect(html).toMatch(/프로 구독하기<\/a><p[^>]*>테스트 결제 환경이며 실제로 청구되지 않습니다<\/p>/);
});

it("요금제·설정과 같이 랜딩의 결제 버튼은 초록이 아닌 보조 버튼이다", () => {
  const html = renderToStaticMarkup(<PricingTier tier="pro" priceLabel="월 2,000원" />);
  expect(html).toMatch(/<a [^>]*bg-surface-strong[^>]*>프로 구독하기<\/a>/);
  expect(html).not.toContain("bg-primary text-on-primary");
});

it.each([
  ["월 2,000원", "월 ", "2,000", "원"],
  ["0원", "", "0", "원"],
])("가격 %s의 숫자는 크게, 단위는 숫자보다 작게 표시한다", (label, prefix, number, unit) => {
  const html = renderToStaticMarkup(<PricingTier tier="pro" priceLabel={label} />);
  const price = html.match(/<p class="[^"]*tabular-nums[^"]*">(.*?)<\/p>/)?.[1] ?? "";
  expect(price).toMatch(new RegExp(`<span class="[^"]*text-display-md[^"]*">${number}</span>`));
  expect(price).toMatch(new RegExp(`<span class="[^"]*text-title-sm[^"]*">${unit}</span>$`));
  if (prefix) expect(price).toMatch(new RegExp(`^<span class="[^"]*text-title-sm[^"]*">${prefix}</span>`));
});
