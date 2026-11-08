import type { Plan } from "@/types";
import { getMonthlyLimit } from "@/lib/plan";
import { Badge } from "./Badge";
import { Button } from "./Button";

// 무료의 월별 추이 잠금과, 이번 달 분석 횟수 소진 안내에 같은 카드를 쓴다.
type LockedPanelProps = { reason?: "trends" } | { reason: "quota"; plan: Plan };

export function LockedPanel(props: LockedPanelProps) {
  const quota = props.reason === "quota";
  const upgrade = !quota || props.plan === "free";
  const title = quota ? `이번 달 분석 ${getMonthlyLimit(props.plan)}회를 모두 썼어요` : "월별 추이는 프로에서 볼 수 있어요";
  const description = !quota
    ? "카드 여러 장의 지출을 달마다 합쳐 보고, 카테고리별로 전월보다 얼마나 늘고 줄었는지 확인해요."
    : upgrade ? `프로는 매달 ${getMonthlyLimit("pro")}회까지 분석하고 월별 추이도 볼 수 있어요.` : "다음 달 1일 00:00(KST)에 다시 채워져요.";

  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border border-hairline bg-canvas px-6 py-12 text-center break-keep">
      {!quota && <Badge variant="lock">프로 전용</Badge>}
      <h2 className="text-title-md text-ink">{title}</h2>
      <p className="max-w-[360px] text-body-sm text-body">{description}</p>
      {upgrade && <>
        <Button href="/api/checkout" variant="primary" size="md">프로 구독하기</Button>
        <p className="text-caption text-muted">테스트 결제 환경이며 실제로 청구되지 않습니다</p>
      </>}
    </section>
  );
}
