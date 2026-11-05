import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SavingTip } from "./SavingTip";

it("저장된 절약 제안 문장을 안전하게 표시한다", () => {
  const html = renderToStaticMarkup(<SavingTip title="구독을 확인해 보세요" detail="<script>중복 구독</script>이 있어요" />);
  expect(html).toContain("구독을 확인해 보세요");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
});
