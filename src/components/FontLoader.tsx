"use client";

import { useEffect } from "react";

// Pretendard @font-face(전체 CSS의 약 70%)를 inlineCss 묶음에서 빼고, 마운트 뒤 별도 <link>로 불러온다.
export function FontLoader() {
  useEffect(() => {
    import("pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css");
  }, []);
  return null;
}
