import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Check, Lock, Minus, ShieldCheck } from "lucide-react";
import { Icon } from "./Icon";

const props = { size: 20, strokeWidth: 1.5, "aria-hidden": "true", className: "shrink-0 text-primary" } as const;

it.each([
  ["check", Check],
  ["shield-check", ShieldCheck],
  ["minus", Minus],
  ["lock", Lock],
] as const)("%s 아이콘을 lucide-react와 똑같은 마크업으로 그린다", (name, Lucide) => {
  expect(renderToStaticMarkup(<Icon name={name} {...props} />)).toBe(renderToStaticMarkup(<Lucide {...props} />));
});

it("클라이언트 모듈인 lucide-react를 import하지 않아 서버 컴포넌트로 남는다", () => {
  const source = readFileSync(new URL("./Icon.tsx", import.meta.url), "utf8");
  expect(source).not.toMatch(/from\s+["']lucide-react/);
  expect(source).not.toMatch(/^["']use client["']/m);
});

it.each(["./Hero.tsx", "./PricingTier.tsx", "./Badge.tsx", "../app/page.tsx", "../app/login/page.tsx"])(
  "공개 페이지의 %s는 클라이언트 경계(lucide-react, next/link)를 만들지 않는다",
  (file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    expect(source).not.toMatch(/from\s+["'](lucide-react|next\/link)["']/);
  },
);
