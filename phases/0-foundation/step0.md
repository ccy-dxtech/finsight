# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (디렉토리 구조, 환경 변수)
- `/docs/ADR.md` (ADR-001, 010, 014)
- `/scripts/hooks/tdd-guard.sh` (어떤 파일이 테스트 없이 편집 가능한지)

현재 저장소에는 `package.json`과 `src/`가 없다. 신규 프로젝트를 초기화하는 step이다.

## 작업

1. 저장소 루트에 Next.js(App Router, TypeScript strict, Tailwind CSS, `src/` 디렉토리 사용, ESLint)를 세팅한다. 최신 안정 버전(16)을 쓴다. 이미 있는 `docs/`, `scripts/`, `.claude/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`는 건드리지 않는다. `create-next-app`이 비어 있지 않은 디렉토리를 거부하면 임시 디렉토리에서 생성한 뒤 필요한 파일만 옮긴다.
2. 의존성을 설치한다:
   - 런타임: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `@polar-sh/nextjs`, `zod`, `server-only`, `lucide-react`, `pretendard`, SheetJS(`xlsx`)
   - 개발: `vitest`
   - SheetJS는 npm 레지스트리 버전이 오래되었으므로 공식 배포처 tarball(`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`)로 설치한다.
3. Vitest 설정(`vitest.config.ts`): `src/**/*.test.{ts,tsx}`를 대상으로 하고, `.tsx`는 React automatic JSX로 변환되게 한다. `@/` 경로 별칭이 tsconfig와 동일하게 동작해야 한다. `package.json`의 `test`는 `vitest run`, `lint`는 `eslint`로 둔다.
4. `.env.example`을 만든다. ARCHITECTURE.md "환경 변수" 표의 변수명을 모두 넣고 값은 비워 둔다(모델 ID 3개와 `POLAR_SERVER=sandbox`, `NEXT_PUBLIC_PRO_PRICE_LABEL=월 1,000원`은 기본값 기입). `.gitignore`에 `.env*`(단 `.env.example` 제외)가 들어 있는지 확인한다.
5. 스모크 테스트 `src/lib/smoke.test.ts`(1 + 1 === 2 수준)를 먼저 만들어 `npm test`가 동작하는지 확인한다. 이 파일은 이후 step에서 지우지 않는다.

시그니처 수준 지시: 폴더 구조는 ARCHITECTURE.md의 "디렉토리 구조"를 따르되 이 step에서는 빈 디렉토리를 미리 만들지 않는다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가(`src/app` 사용)?
   - ADR 기술 스택을 벗어나지 않았는가?
   - `.env.example` 외에 비밀값이 커밋 대상에 없는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- SheetJS를 npm 레지스트리 버전으로 설치하지 마라. 이유: 오래된 취약 버전이다(ADR-010).
- Testing Library, jsdom, 전역 상태 라이브러리, 외부 차트 라이브러리를 설치하지 마라. 이유: ADR-013, 014에서 쓰지 않기로 했다.
- `docs/`와 `scripts/`를 수정하지 마라.
