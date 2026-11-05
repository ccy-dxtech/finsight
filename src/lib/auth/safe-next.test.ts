import { expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

it.each([null, "", "//evil.com", "https://evil.com", "/\\evil", "\\evil", "/\n/evil.com", "/a/..//evil.com"])("외부 이동 가능 경로 %s는 대시보드로 바꾼다", (next) => {
  expect(safeNextPath(next)).toBe("/dashboard");
});

it.each(["/", "/dashboard/trends?x=1", "/api/checkout"])("내부 경로 %s를 보존한다", (next) => {
  expect(safeNextPath(next)).toBe(next);
});
