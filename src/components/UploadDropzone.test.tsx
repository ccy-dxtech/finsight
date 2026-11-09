import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UploadDropzone } from "./UploadDropzone";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

it("한 파일 선택과 지원 형식, 크기를 안내한다", () => {
  const html = renderToStaticMarkup(<UploadDropzone />);
  expect(html).toContain('type="file"');
  expect(html).toContain('accept=".csv,.xls,.xlsx,.pdf"');
  expect(html).toContain("CSV, xls, xlsx, PDF");
  expect(html).toContain("최대 4MB");
  expect(html).not.toContain("multiple");
  expect(html).not.toContain("disabled");
});
