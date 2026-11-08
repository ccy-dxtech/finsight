import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-[960px] justify-items-start gap-4 break-keep px-8 py-24">
      <h1 className="text-title-lg text-ink">페이지를 찾을 수 없어요</h1>
      <p className="text-body-md text-body">주소가 바뀌었거나 삭제된 리포트일 수 있어요.</p>
      <Button variant="primary" size="md" href="/dashboard">대시보드로 가기</Button>
    </main>
  );
}
