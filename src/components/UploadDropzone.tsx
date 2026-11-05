"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { AnalyzingState } from "./AnalyzingState";
import { Button } from "./Button";
import { Notice } from "./Notice";

export function UploadDropzone({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  const disabled = remaining <= 0;

  async function analyze(files: FileList | null) {
    if (disabled || analyzing || !files?.length) return;
    setOver(false);
    setError("");
    if (files.length !== 1 || !/\.(csv|xls|xlsx)$/i.test(files[0].name)) {
      setError("**지원하지 않는 파일이에요.** CSV, xls, xlsx 파일 하나를 올려 주세요. 횟수는 차감되지 않았어요.");
      return;
    }
    if (files[0].size > 5 * 1024 * 1024) {
      setError("**파일이 5MB를 넘어요.** 5MB 이하의 파일을 올려 주세요. 횟수는 차감되지 않았어요.");
      return;
    }
    const form = new FormData();
    form.append("file", files[0]);
    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message);
        setAnalyzing(false);
        return;
      }
      router.push("/dashboard/reports/" + result.reportId);
    } catch {
      setError("**분석 결과를 확인하지 못했어요.** 잠시 후 최근 리포트를 확인하고 다시 시도해 주세요. 횟수는 차감되지 않았어요.");
      setAnalyzing(false);
    }
  }

  if (analyzing) return <AnalyzingState />;
  const message = /^\*\*(.*?)\*\*\s*([\s\S]*)$/.exec(error);
  return (
    <div className="grid gap-4 break-keep">
      <label
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${disabled ? "cursor-not-allowed border-border-strong bg-surface-soft" : over ? "cursor-pointer border-primary bg-primary-soft" : "cursor-pointer border-border-strong bg-canvas hover:border-primary hover:bg-primary-soft"}`}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); void analyze(event.dataTransfer.files); }}
      >
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Upload size={24} strokeWidth={1.5} aria-hidden="true" /></span>
        <span className="text-title-sm text-ink">카드 명세서를 끌어다 놓거나 선택하세요</span>
        <span className="text-body-sm text-muted">CSV, xls, xlsx · 한 번에 한 파일 · 최대 5MB · 3,000건</span>
        <input className="sr-only" type="file" accept=".csv,.xls,.xlsx" disabled={disabled} onChange={(event) => { void analyze(event.target.files); event.target.value = ""; }} />
      </label>
      {disabled && <div className="grid gap-3"><Notice>이번 달 분석 횟수를 모두 사용했어요. 요금제를 확인하거나 다음 달에 다시 이용해 주세요.</Notice><div><Button variant="primary" size="md" href="/#pricing">요금제 살펴보기</Button><p className="mt-3 text-caption text-muted">테스트 결제 환경이며 실제로 청구되지 않습니다</p></div></div>}
      {error && <Notice variant="error">{message ? <><strong>{message[1]}</strong> {message[2]}</> : error}</Notice>}
    </div>
  );
}
