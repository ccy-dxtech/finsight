"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { checkUploadFile } from "@/lib/upload";
import { AnalyzingState } from "./AnalyzingState";
import { Button } from "./Button";
import { Notice } from "./Notice";

// 파일을 고르면 형식·크기만 확인해 두고, "분석하기"를 눌러야 분석을 시작한다.
// 이번 달 횟수를 다 쓰면 대시보드가 이 영역 대신 LockedPanel 소진 카드를 보여준다.
export function UploadDropzone() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");

  function select(files: FileList | null) {
    if (analyzing || !files?.length) return;
    setOver(false);
    setError("");
    setFile(null);
    const fileError = files.length === 1 ? checkUploadFile(files[0]) : "unsupported_file";
    if (fileError === "unsupported_file") {
      setError("**지원하지 않는 파일이에요.** CSV, xls, xlsx, PDF 파일 하나를 올려 주세요. 횟수는 차감되지 않았어요.");
      return;
    }
    if (fileError === "file_too_large") {
      setError("**파일이 4MB를 넘어요.** 4MB 이하의 파일을 올려 주세요. 횟수는 차감되지 않았어요.");
      return;
    }
    setFile(files[0]);
  }

  async function analyze() {
    if (analyzing || !file) return;
    setError("");
    const form = new FormData();
    form.append("file", file);
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
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${over ? "border-primary bg-primary-soft" : "border-border-strong bg-canvas hover:border-primary hover:bg-primary-soft"}`}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files); }}
      >
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Upload size={24} strokeWidth={1.5} aria-hidden="true" /></span>
        <span className="text-title-sm text-ink">카드 명세서를 끌어다 놓거나 선택하세요</span>
        <span className="text-body-sm text-muted">CSV, xls, xlsx, PDF · 한 번에 한 파일 · 최대 4MB · 3,000건</span>
        <input className="sr-only" type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(event) => { select(event.target.files); event.target.value = ""; }} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hairline bg-canvas px-6 py-4">
        <p className="min-w-0 flex-1 basis-48 text-body-md" aria-live="polite">
          {file
            ? <><span className="text-muted">선택한 파일 </span><strong className="wrap-anywhere text-ink">{file.name}</strong></>
            : <span className="text-muted">선택한 파일이 없어요. 위에서 명세서를 골라 주세요.</span>}
        </p>
        <Button variant="primary" size="md" disabled={!file} onClick={() => void analyze()}>분석하기</Button>
      </div>
      {error && <Notice variant="error">{message ? <><strong>{message[1]}</strong> {message[2]}</> : error}</Notice>}
    </div>
  );
}
