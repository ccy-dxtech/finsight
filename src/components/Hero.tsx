import { Badge } from "./Badge";
import { Button } from "./Button";

export function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="break-keep py-24 text-left">
      <Badge variant="pro">AI 지출 리포트</Badge>
      <h1 className="mt-4 text-display-md text-ink sm:text-display-lg">
        카드 명세서만 올리면,<br />
        <em className="text-primary not-italic">새는 돈</em>이 보여요
      </h1>
      <p className="mt-4 mb-8 max-w-[520px] text-body-lg text-body">
        카드사에서 받은 엑셀·CSV를 그대로 올리세요. 어디에 많이 썼는지, 무엇을 줄일 수 있는지 AI가 한국어 리포트로 알려드려요.
      </p>
      <Button variant="primary" href={isLoggedIn ? "/dashboard" : "/login"}>
        {isLoggedIn ? "대시보드로 가기" : "시작하기"}
      </Button>
    </section>
  );
}
