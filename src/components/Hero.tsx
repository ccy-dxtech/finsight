import { Check, ShieldCheck } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";

const reassurances = [
  { Icon: ShieldCheck, text: "원본 파일은 저장하지 않아요. 날짜·가맹점·금액만 남겨요." },
  { Icon: Check, text: "무료로 매달 3회 분석할 수 있어요." },
];

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="break-keep">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-8 py-24 text-left xl:grid-cols-[minmax(0,1fr)_480px]">
        <div>
          <Badge variant="pro">AI 지출 리포트</Badge>
          <h1 className="mt-4 text-display-sm text-ink sm:text-display-lg">
            카드 명세서만 올리면,<br />
            <em className="text-primary not-italic">새는 돈</em>이 보여요
          </h1>
          <p className="mt-4 mb-8 max-w-[520px] text-body-lg text-body">
            카드사에서 받은 엑셀·CSV를 그대로 올리세요. 어디에 많이 썼는지, 무엇을 줄일 수 있는지 AI가 한국어 리포트로 알려드려요.
          </p>
          <Button variant="primary" href={isLoggedIn ? "/dashboard" : "/login"}>
            {isLoggedIn ? "대시보드로 가기" : "시작하기"}
          </Button>
          <ul className="mt-6 grid gap-2 text-body-sm text-body">
            {reassurances.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-2">
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        {/* 디자인 시스템 Cover 그림의 블록·막대 구성. 숫자 없는 장식이라 샘플 리포트가 아니다 */}
        <svg viewBox="0 0 480 256" aria-hidden="true" focusable="false" className="hidden h-auto w-full xl:block">
          <rect className="fill-primary" x="0" y="0" width="176" height="256" rx="24" />
          <rect className="fill-canvas" x="22" y="168" width="24" height="64" rx="8" />
          <rect className="fill-canvas" x="58" y="144" width="24" height="88" rx="8" />
          <rect className="fill-canvas" x="94" y="184" width="24" height="48" rx="8" />
          <rect className="fill-canvas" x="130" y="120" width="24" height="112" rx="8" />
          <rect className="fill-primary-soft" x="200" y="0" width="280" height="144" rx="24" />
          <rect className="fill-primary" x="224" y="30" width="184" height="12" rx="6" />
          <rect className="fill-primary" x="224" y="54" width="136" height="12" rx="6" />
          <rect className="fill-primary" x="224" y="78" width="104" height="12" rx="6" />
          <rect className="fill-primary-muted" x="224" y="102" width="72" height="12" rx="6" />
          <rect className="fill-surface-strong" x="200" y="168" width="280" height="88" rx="24" />
          <rect className="fill-canvas" x="224" y="194" width="152" height="12" rx="6" />
          <rect className="fill-canvas" x="224" y="218" width="96" height="12" rx="6" />
        </svg>
      </div>
    </section>
  );
}
