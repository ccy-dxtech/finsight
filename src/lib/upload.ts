// Vercel 함수의 요청 본문 한도(4.5MB)를 넘으면 JSON이 아닌 413이 오므로, multipart 여유를 두고 4MB로 막는다.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function checkUploadFile({ name, size }: { name: string; size: number }): "unsupported_file" | "file_too_large" | null {
  if (!/\.(csv|xls|xlsx|pdf)$/i.test(name)) return "unsupported_file";
  if (size > MAX_UPLOAD_BYTES) return "file_too_large";
  return null;
}
