export function AnalyzingState() {
  return (
    <div role="status" className="flex flex-col items-center gap-4 break-keep px-6 py-24 text-center text-title-sm text-ink">
      <span aria-hidden="true" className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary [animation-duration:0.9s] motion-reduce:[animation-duration:2.4s]" />
      <p>분석 중이에요. 1~2분 걸릴 수 있어요</p>
    </div>
  );
}
