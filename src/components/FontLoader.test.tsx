import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FontLoader } from "./FontLoader";

const fontCss = "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

it("화면에는 아무것도 그리지 않는다", () => {
  expect(renderToStaticMarkup(<FontLoader />)).toBe("");
});

it("Pretendard 글꼴 CSS는 마운트 뒤 동적 import로만 불러와 인라인 CSS에서 빠진다", () => {
  const source = readFileSync(new URL("./FontLoader.tsx", import.meta.url), "utf8");
  expect(source).toContain('"use client"');
  expect(source).toContain(`import("${fontCss}")`);
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  expect(layout).not.toContain(`import "${fontCss}"`);
});
