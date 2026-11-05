import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UploadDropzone } from "./UploadDropzone";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

it("한 파일 선택과 지원 형식, 크기를 안내한다", () => {
  const html = renderToStaticMarkup(<UploadDropzone remaining={2} />);
  expect(html).toContain('type="file"');
  expect(html).toContain('accept=".csv,.xls,.xlsx"');
  expect(html).toContain("최대 5MB");
  expect(html).not.toContain("multiple");
  expect(html).not.toContain("disabled");
});

it("0회에는 파일 선택을 비활성화하고 요금제를 안내한다", () => {
  const html = renderToStaticMarkup(<UploadDropzone remaining={0} />);
  expect(html).toMatch(/<input[^>]*disabled=""/);
  expect(html).toContain("이번 달 분석 횟수를 모두 사용했어요");
  expect(html).toContain('href="/#pricing"');
  expect(html).toContain("테스트 결제 환경이며 실제로 청구되지 않습니다");
});
