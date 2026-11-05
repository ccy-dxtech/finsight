# Step 2: auth-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` ("화면" `/login`, "시나리오" 로그인 없이 `/dashboard`)
- `/docs/ARCHITECTURE.md` ("디렉토리 구조", "화면과 컴포넌트")
- `/docs/ADR.md` (ADR-002)
- `/docs/UI_GUIDE.md`, `/docs/design-system/README.md`, `/docs/design-system/tokens.css`
- `/docs/design-system/components/Button/README.md`, `/docs/design-system/components/Button/preview.html`
- 이전 step의 `src/lib/supabase/*`, `src/app/globals.css`, `src/app/layout.tsx`

설치된 Next.js 버전의 공식 문서에서 보호 경로 처리 규약(`proxy.ts` 또는 `middleware.ts`)을 확인하고 그 버전에 맞게 작성하라. ARCHITECTURE.md는 Next 16+는 `proxy.ts`라고 적고 있다.

## 작업

테스트를 먼저 작성하고 구현한다.

1. `src/lib/auth/safe-next.ts` — `safeNextPath(next: string | null): string`: 내부 경로(`/`로 시작하고 `//`나 `\`로 시작하지 않으며 스킴이 없는 값)만 허용하고 아니면 `/dashboard`를 반환한다. 테스트: `//evil.com`, `https://evil.com`, `/\evil`, 빈 값, `/dashboard/trends?x=1`.
2. `src/proxy.ts`(Next 버전에 따라 `middleware.ts`): `updateSession`으로 세션을 갱신하고, 비로그인으로 `/dashboard` 하위에 접근하면 `/login?next=<원래 경로>`로 리다이렉트한다. matcher는 정적 자원을 제외한다.
3. `src/app/auth/callback/route.ts`: `code`를 세션으로 교환한 뒤 `safeNextPath(next)`로 이동한다. 교환 실패 시 `/login`으로 보내고 오류 안내 쿼리를 붙인다.
4. `src/app/login/page.tsx`: 가운데 큰 `Button` 하나("Google 계정으로 로그인"), 한국어 문구. 클릭하면 `signInWithOAuth({ provider: "google", options: { redirectTo: NEXT_PUBLIC_SITE_URL + "/auth/callback?next=..." } })`. 버튼 상호작용이 필요한 부분만 Client Component로 분리한다. 이미 로그인했으면 `next`(또는 `/dashboard`)로 보낸다.
5. `src/app/dashboard/layout.tsx`: 서버에서 사용자를 다시 확인하고(없으면 `/login`) 자식을 렌더링한다. 내비게이션(`AppHeader`)은 이후 step에서 추가한다.
6. 이 step에서 필요한 최소 `Button` 마크업은 `src/components/Button.tsx`로 만들되 디자인 시스템 명세(`Button/README.md`)를 따르고 `Button.test.tsx`를 먼저 작성한다(`renderToStaticMarkup`, 비활성 상태·문구 확인). 다음 phase의 `ui-primitives`에서 Badge·Notice를 추가하고 Button을 보완한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `next` 파라미터가 항상 `safeNextPath`를 거치는가?
   - 비밀값이 클라이언트 번들에 들어가지 않았는가?
   - 화면 문구가 한국어이고 영어 UI 문구(Login, Sign in 등)가 없는가?
3. 결과에 따라 `phases/1-analysis/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `next` 쿼리 값을 검증 없이 리다이렉트에 쓰지 마라. 이유: open redirect 취약점이 된다.
- 이메일/비밀번호 로그인, 카카오 로그인을 추가하지 마라. 이유: ADR-002에서 Google만 쓰기로 했다.
- proxy만 믿고 대시보드 레이아웃의 사용자 확인을 생략하지 마라. 이유: matcher 누락 시 보호가 뚫린다.
- 기존 테스트를 깨뜨리지 마라.
