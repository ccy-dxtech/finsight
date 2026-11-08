"use client";

import { Button } from "@/components/Button";

// 오류 내용에는 DB 메시지나 거래 정보가 섞일 수 있어 화면에 보여주지 않는다.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid max-w-[960px] justify-items-start gap-4 break-keep px-8 py-24">
      <h1 className="text-title-lg text-ink">화면을 불러오지 못했어요</h1>
      <p className="text-body-md text-body">잠시 후 다시 시도해 주세요. 계속 안 되면 대시보드로 돌아가 주세요.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={reset}>다시 시도</Button>
        <Button variant="secondary" size="md" href="/dashboard">대시보드로 가기</Button>
      </div>
    </main>
  );
}
