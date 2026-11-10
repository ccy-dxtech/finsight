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
  expect(html).not.toMatch(/<input[^>]*disabled/);
});

it("파일을 고르기 전에는 분석하기 버튼을 비활성으로 두고 고를 곳을 알려 준다", () => {
  const html = renderToStaticMarkup(<UploadDropzone />);
  expect(html).toContain("선택한 파일이 없어요");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>분석하기<\/button>/);
  expect(html.indexOf('type="file"')).toBeLessThan(html.indexOf(">분석하기<"));
});
