import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge } from "./Badge";

it.each([
  ["default", "무료", "bg-surface-strong"],
  ["pro", "프로", "bg-primary-soft"],
  ["lock", "프로 전용", "text-muted"],
] as const)("%s 배지를 비대화형 라벨로 표시한다", (variant, label, token) => {
  const html = renderToStaticMarkup(<Badge variant={variant}>{label}</Badge>);
  expect(html).toMatch(/^<span /);
  expect(html).toContain(label);
  expect(html).toContain(token);
  expect(html).not.toContain("<button");
});

it("잠금 배지에 장식용 Lock 아이콘을 표시한다", () => {
  const html = renderToStaticMarkup(<Badge variant="lock">프로 전용</Badge>);
  expect(html).toContain("lucide-lock");
  expect(html).toContain('stroke-width="1.5"');
  expect(html).toContain('aria-hidden="true"');
});

it("기본 배지에 제외 건수 등 사용자 문구를 표시한다", () => {
  const html = renderToStaticMarkup(<Badge>제외 3건</Badge>);
  expect(html).toContain("제외 3건");
  expect(html).not.toContain("<svg");
});
