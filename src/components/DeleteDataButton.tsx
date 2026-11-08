"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyData } from "@/lib/client/delete-data";
import { Button } from "./Button";
import { Notice } from "./Notice";

export function DeleteDataButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  async function remove() {
    if (!window.confirm("거래와 리포트를 모두 삭제할까요? 이 작업은 되돌릴 수 없어요. 계정, 구독, 이번 달 사용 횟수는 그대로예요.")) return;
    setPending(true);
    setResult(null);
    try {
      const response = await deleteMyData();
      if (!response.ok) throw new Error("delete_failed");
      setResult("success");
      router.refresh();
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button variant="danger" size="md" aria-haspopup="dialog" disabled={pending} onClick={remove}>{pending ? "삭제 중" : "전체 삭제"}</Button>
      {result === "error" && <Notice variant="error"><strong>데이터를 모두 지우지 못했어요.</strong> 일부만 지워졌을 수 있어요. 다시 시도해 주세요.</Notice>}
      {result === "success" && <Notice variant="success">거래와 리포트를 모두 삭제했어요.</Notice>}
    </div>
  );
}
