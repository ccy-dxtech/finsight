import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import RootLayout, { metadata } from "./layout";

test("한국어 문서에 기본 글꼴·줄바꿈·색을 적용하고 본문을 렌더링해요", () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <main>카드 명세서를 준비해 주세요</main>
    </RootLayout>,
  );

  expect(html).toContain('lang="ko"');
  const bodyClasses = html.match(/<body class="([^"]+)"/)?.[1].split(" ");
  expect(bodyClasses).toEqual(
    expect.arrayContaining(["font-sans", "break-keep", "text-body", "bg-canvas"]),
  );
  expect(html).toContain("<main>카드 명세서를 준비해 주세요</main>");
  expect(metadata.title).toBe("FinSight");
});

test("브라우저 탭 아이콘은 초록 포인트 색의 app/icon.svg예요", () => {
  const svg = readFileSync(new URL("./icon.svg", import.meta.url), "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain("#0e7f55");
});
