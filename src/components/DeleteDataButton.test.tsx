import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DeleteDataButton } from "./DeleteDataButton";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("삭제 버튼에 확인 대화상자가 있음을 알린다", () => {
  const html = renderToStaticMarkup(<DeleteDataButton />);
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain("전체 삭제");
  expect(html).toContain("text-danger");
});
