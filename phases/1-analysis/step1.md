# Step 1: supabase-clients

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: service role은 서버에서만)
- `/docs/ARCHITECTURE.md` ("디렉토리 구조", "환경 변수")
- `/docs/ADR.md` (ADR-002, 004)
- 이전 step에서 만든 `.env.example`, `package.json`, `supabase/migrations/`

설치된 `@supabase/ssr`과 `next` 버전의 공식 문서/타입을 확인하고 그 버전의 API(특히 `cookies()`의 async 여부)에 맞게 작성하라.

## 작업

`src/lib/supabase/` 아래에 클라이언트 헬퍼를 만든다. 쿠키·환경 변수 의존이 있으므로 테스트에서는 의존성을 주입하거나 모킹한다. 테스트를 먼저 작성한다.

1. `server.ts` — `createServerClient()`: 사용자 세션 쿠키 기반 Supabase 클라이언트(anon key). `import "server-only"`.
2. `browser.ts` — `createBrowserClient()`: 로그인 버튼용 브라우저 클라이언트(anon key만 사용).
3. `admin.ts` — `createAdminClient()`: service role 클라이언트. `import "server-only"`. 웹훅의 `profiles` 갱신에만 쓴다. 세션을 저장하지 않는 설정(persistSession false).
4. `session.ts` — `updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }>`: proxy에서 쓸 세션 갱신 헬퍼.
5. 테스트: `admin.ts`가 `SUPABASE_SERVICE_ROLE_KEY` 없이 호출되면 명확한 오류를 던지는지, `browser.ts` 소스에 `SERVICE_ROLE`이 등장하지 않는지(파일 문자열 검사).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rn "SERVICE_ROLE" src --include=*.ts --include=*.tsx -l | grep -v "lib/supabase/admin"
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - service role 키가 `admin.ts` 외에서 참조되지 않고 `NEXT_PUBLIC_`으로 노출되지 않는가?
   - `admin.ts`와 `server.ts`에 `server-only`가 있는가?
3. 결과에 따라 `phases/1-analysis/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 클라이언트 컴포넌트에서 import되는 파일에 service role을 쓰지 마라. 이유: 번들에 비밀값이 유입된다.
- 사용자 요청 경로에서 service role로 사용자 데이터를 읽지 마라. 이유: RLS를 우회하게 된다. admin 클라이언트는 웹훅 전용이다.
- 기존 테스트를 깨뜨리지 마라.
