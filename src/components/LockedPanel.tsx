import { Badge } from "./Badge";
import { Button } from "./Button";

export function LockedPanel() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border border-hairline bg-canvas px-6 py-12 text-center break-keep">
      <Badge variant="lock">프로 전용</Badge>
      <h2 className="text-title-md text-ink">월별 추이는 프로에서 볼 수 있어요</h2>
      <p className="max-w-[360px] text-body-sm text-body">카드 여러 장의 지출을 달마다 합쳐 보고, 카테고리별로 전월보다 얼마나 늘고 줄었는지 확인해요.</p>
      <Button href="/api/checkout" variant="primary" size="md">프로 구독하기</Button>
      <p className="text-caption text-muted">테스트 결제 환경이며 실제로 청구되지 않습니다</p>
    </section>
  );
}
