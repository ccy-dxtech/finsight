import { Check, Minus } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";

type PricingTierProps = {
  tier: "free" | "pro";
  priceLabel: string;
};

export function PricingTier({ tier, priceLabel }: PricingTierProps) {
  const isPro = tier === "pro";
  const features = isPro
    ? ["월 30회 분석", "핵심 리포트와 더 깊은 분석", "월별 추이와 카테고리 증감"]
    : ["월 3회 분석", "핵심 리포트", "월별 추이 미포함"];

  return (
    <article className={`flex min-w-0 flex-col gap-6 break-keep rounded-xl bg-canvas p-8 ${isPro ? "border-2 border-primary" : "border border-hairline"}`}>
      <h3 className="flex items-center gap-2 text-title-md text-ink">
        {isPro ? "프로" : "무료"}
        {isPro && <Badge variant="pro">추천</Badge>}
      </h3>
      <p className="text-ink tabular-nums">
        {priceLabel.split(/([\d,]+)/).filter(Boolean).map((part, index) => (
          <span key={index} className={/\d/.test(part) ? "text-display-md" : index > 0 ? "ml-1 text-title-sm text-body" : "text-title-sm text-body"}>{part}</span>
        ))}
      </p>
      <ul className="grid gap-3 text-body-md">
        {features.map((feature, index) => {
          const unavailable = !isPro && index === 2;
          const Icon = unavailable ? Minus : Check;
          return (
            <li key={feature} className={`flex gap-2 ${unavailable ? "text-muted" : "text-body"}`}>
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" className={`mt-1 shrink-0 ${unavailable ? "text-body" : "text-primary"}`} />
              {feature}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto">
        <Button variant="secondary" size="md" href={isPro ? "/api/checkout" : "/login"} className="w-full">
          {isPro ? "프로 구독하기" : "시작하기"}
        </Button>
        <p className="mt-3 text-center text-caption text-muted">
          {isPro ? "테스트 결제 환경이며 실제로 청구되지 않습니다" : "결제 정보 없이 바로 시작해요"}
        </p>
      </div>
    </article>
  );
}
