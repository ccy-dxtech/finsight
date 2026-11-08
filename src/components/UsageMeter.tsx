export function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  return (
    <section className="rounded-xl border border-hairline bg-canvas p-6 break-keep">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-nav-link text-body">이번 달 남은 분석</h2>
        <p className="text-number-lg text-ink tabular-nums">{remaining}<span className="ml-1 text-body-sm text-muted">/ {limit}회</span></p>
      </div>
      <div role="meter" aria-label="이번 달 남은 분석 횟수" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={limit} className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-strong">
        <span className="block h-full rounded-pill bg-primary" style={{ width: `${remaining / limit * 100}%` }} />
      </div>
      <p className="mt-2 text-caption text-muted">매월 1일 00:00(KST)에 다시 채워져요.</p>
    </section>
  );
}
