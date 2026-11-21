import type { Metadata } from "next";
import type { ReactNode } from "react";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinSight",
  description: "카드 명세서를 분석하는 한국어 지출 리포트",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans break-keep text-body bg-canvas text-body-md">
        {children}
      </body>
    </html>
  );
}
