const steps = [
  { title: "Google로 로그인", description: "가입 절차 없이 바로 시작해요." },
  { title: "명세서 올리기", description: "카드사에서 받은 CSV·엑셀 파일 하나를 올려요." },
  { title: "AI 리포트 확인", description: "1~2분 뒤 카테고리, 구독, 절약 제안이 정리돼요." },
];

export function StepList() {
  return (
    <ol className="grid gap-6 break-keep md:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-xl border border-hairline bg-canvas p-8">
          <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-nav-link font-bold text-on-primary">
            {index + 1}
          </span>
          <h3 className="mt-4 mb-1 text-title-md text-ink">{step.title}</h3>
          <p className="text-body-md text-body">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
