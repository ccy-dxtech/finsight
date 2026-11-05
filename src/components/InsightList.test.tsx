import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InsightList } from "./InsightList";

it("정기결제의 모든 거래와 이상 지출의 저장된 날짜·가맹점·금액·관찰을 표시한다", () => {
  const transaction = { id: 1, occurredOn: "2026-10-03", merchant: "영상 구독", amount: 9007199254740993n };
  const html = renderToStaticMarkup(<InsightList recurring={[{ transactions: [transaction, { ...transaction, id: 2, occurredOn: "2026-10-04", amount: -1000n }], note: "반복 결제가 보여요" }]} anomalies={[{ transaction, reason: "큰 지출이 보여요" }]} />);
  for (const text of ["정기결제·구독", "이상 지출", "2026.10.03", "2026.10.04", "영상 구독", "9,007,199,254,740,993", "-1,000", "반복 결제가 보여요", "큰 지출이 보여요"]) expect(html).toContain(text);
});

it("빈 인사이트를 안내한다", () => {
  const html = renderToStaticMarkup(<InsightList recurring={[]} anomalies={[]} />);
  expect(html).toContain("발견되지 않았어요");
});
