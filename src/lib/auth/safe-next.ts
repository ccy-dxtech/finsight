export function safeNextPath(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(next)) {
    return "/dashboard";
  }

  // URL 정규화로 경로 앞에 이중 슬래시가 생기는 경우도 막는다.
  if (new URL(next, "https://finsight.invalid").pathname.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}
