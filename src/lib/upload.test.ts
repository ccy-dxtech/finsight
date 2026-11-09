import { expect, it } from "vitest";
import { checkUploadFile } from "./upload";

const MB = 1024 * 1024;

// Vercel 함수의 요청 본문 한도(4.5MB) 안에 multipart 여유를 두고 4MB까지만 받는다.
it.each([
  ["카드.csv", 4 * MB, null],
  ["카드.XLSX", 1, null],
  ["카드.xls", 4 * MB + 1, "file_too_large"],
  ["카드.PDF", 4 * MB, null],
  ["카드.pdf", 4 * MB + 1, "file_too_large"],
  ["카드.hwp", 1, "unsupported_file"],
  ["카드.csv.exe", 1, "unsupported_file"],
] as const)("%s, %d바이트 → %s", (name, size, expected) => {
  expect(checkUploadFile({ name, size })).toBe(expected);
});
