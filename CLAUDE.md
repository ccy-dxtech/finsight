# 프로젝트: FinSight

카드 명세서(CSV·엑셀)를 올리면 AI가 지출을 분석해 한국어 인사이트 리포트를 주는 구독형 웹앱. MVP·프로토타입 단계.
기획은 `docs/PRD.md`, 구조는 `docs/ARCHITECTURE.md`, 결정 근거는 `docs/ADR.md`, 화면 규칙은 `docs/UI_GUIDE.md`, 사용자 여정·단계별 다음 행동은 `docs/UX_GUIDE.md`, 디자인 토큰·컴포넌트 명세는 `docs/design-system/`.

## 기술 스택
- Next.js (App Router) + TypeScript strict mode
- Tailwind CSS
- Supabase: Google 로그인(Auth) + Postgres(RLS)
- Claude API (`@anthropic-ai/sdk`): Haiku 5.5(열 매핑·분류), 인사이트 리포트는 Free=Sonnet 5.5 / Pro=Opus 5.5
- Polar (`@polar-sh/nextjs`): 구독 결제, sandbox 환경만
- Vitest (테스트), Vercel (배포)

## 아키텍처 규칙
- CRITICAL: Claude API, Polar API, Supabase service role 호출은 서버(`app/api/` 라우트 핸들러와 `server-only` 모듈)에서만 한다. 클라이언트 컴포넌트에서 외부 API를 직접 호출하지 말고, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POLAR_*` 비밀값을 `NEXT_PUBLIC_` 변수나 클라이언트 번들에 넣지 말 것.
- CRITICAL: 화면에 표시하는 금액·합계·건수·증감률은 모두 코드가 계산한다. AI 응답 스키마에는 금액 필드를 두지 않고, 거래는 id로 참조하게 한다. AI는 열 찾기, 분류, 해석 문장만 담당한다.
- CRITICAL: 사용자 데이터 테이블은 모두 RLS로 본인 행만 접근하게 한다. `profiles.plan`과 `usage`는 사용자가 직접 쓸 수 없어야 한다(웹훅·RPC만 변경).
- CRITICAL: Pro 여부는 Polar 웹훅이 갱신한 `profiles.plan` 값으로만 판단한다. 결제 성공 리다이렉트 파라미터나 클라이언트 값으로 판단하지 말 것.
- CRITICAL: 업로드한 원본 파일은 저장하지 않는다(메모리에서 처리 후 폐기). 날짜·가맹점·금액 외의 열(카드번호, 이름 등)은 버린다.
- 컴포넌트는 `src/components/`, 타입은 `src/types/`, 순수 로직은 `src/lib/`, 외부 API 래퍼는 `src/services/`에 둔다.
- 화면 문구와 AI 리포트는 한국어가 먼저다. 영어 UI 문구(Get started, Upgrade 등)를 쓰지 않는다. 화면 규칙은 `docs/UI_GUIDE.md`의 "한국어 우선"을 따른다.
- CRITICAL: UI(컴포넌트, 페이지, `globals.css`)를 만들거나 고치기 전에 `docs/design-system/README.md`, `docs/design-system/tokens.css`, 해당 컴포넌트의 `docs/design-system/components/<이름>/README.md`·`preview.html`을 읽고 그 명세와 모양에 맞춘다. 디자인 시스템과 다르게 정한 것은 `docs/UI_GUIDE.md`가 우선한다. 색·글자 크기는 `globals.css`의 `@theme` 토큰만 쓴다.
- 금액은 원 단위 정수(`bigint`)로 다룬다(부동소수점 금지).
- MVP 원칙: 같은 문제는 한 가지 단순한 방법으로 푼다. 처리하지 않는 경우는 `docs/PRD.md`의 "한계"에 적는다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- UI(컴포넌트, 페이지, `globals.css`)를 고친 뒤에는 `docs/BROWSER_TESTING.md` 절차대로 Playwright MCP로 화면을 열어 스크린샷(데스크톱·375px)과 콘솔 오류를 확인한 다음 완료라고 말할 것
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
