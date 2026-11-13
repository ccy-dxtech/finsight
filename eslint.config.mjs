import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // .claude/worktrees는 다른 세션의 작업 공간이다. 루트 lint가 검사하지 않게 뺀다.
  // playwright-report·test-results는 E2E 산출물이다(실패하면 minified trace 뷰어 번들이 생긴다).
  // .gitignore에 있어도 ESLint flat config는 .gitignore를 읽지 않아 여기서도 뺀다.
  // .claude/workflows는 Claude Code Workflow 도구가 실행하는 스크립트다. 최상위 return이 있어
  // 일반 JS 모듈로 파싱되지 않는다.
  globalIgnores([
    ".next/**", "out/**", "build/**", "next-env.d.ts", ".claude/worktrees/**",
    ".claude/workflows/**", "playwright-report/**", "test-results/**",
  ]),
]);
