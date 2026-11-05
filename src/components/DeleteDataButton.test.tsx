import { beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeleteDataButton } from "./DeleteDataButton";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(useState).mockReset();
  vi.mocked(useState).mockImplementation((initial?: unknown): [unknown, (value: unknown) => void] => [initial, vi.fn()]);
});

it("삭제 버튼에 확인 대화상자가 있음을 알린다", () => {
  const html = renderToStaticMarkup(<DeleteDataButton />);
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain("전체 삭제");
  expect(html).toContain("text-danger");
});

it("삭제 중에는 버튼을 비활성화한다", () => {
  vi.mocked(useState).mockReturnValueOnce([true, vi.fn()]);
  const html = renderToStaticMarkup(<DeleteDataButton />);
  expect(html).toContain("삭제 중");
  expect(html).toContain('disabled=""');
});

it.each(["success", "error"])("삭제 결과 %s를 접근 가능한 한국어 안내로 표시한다", (result) => {
  vi.mocked(useState).mockReturnValueOnce([false, vi.fn()]).mockReturnValueOnce([result, vi.fn()]);
  const html = renderToStaticMarkup(<DeleteDataButton />);
  if (result === "success") {
    expect(html).toContain('role="status"');
    expect(html).toContain("거래와 리포트를 모두 삭제했어요.");
  } else {
    expect(html).toContain('role="alert"');
    expect(html).toContain("<strong>데이터를 삭제하지 못했어요.</strong>");
    expect(html).toContain("다시 시도해 주세요. 횟수는 차감되지 않았어요.");
  }
});
