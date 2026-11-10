import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // .claude/worktrees는 다른 세션의 작업 공간이다. 루트 lint가 검사하지 않게 뺀다.
  // playwright-report·test-results는 E2E 산출물이다(실패하면 minified trace 뷰어 번들이 생긴다).
  // .gitignore에 있어도 ESLint flat config는 .gitignore를 읽지 않아 여기서도 뺀다.
  globalIgnores([
    ".next/**", "out/**", "build/**", "next-env.d.ts", ".claude/worktrees/**",
    "playwright-report/**", "test-results/**",
  ]),
]);
