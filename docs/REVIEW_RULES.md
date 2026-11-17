# 리뷰 룰 (REVIEW_RULES)

`/review-code`(PR·브랜치 범위는 correctness·security·conventions 세 서브에이전트, `--staged`는 혼자 한 번에), pre-commit hook, GitHub Action이 모두 이 파일 하나를 기준으로 리뷰한다.
룰을 바꾸면 세 곳에 동시에 반영된다. 룰은 탐지 신호가 분명한 것만 둔다. 반복되는 오탐만 룰로 고치고, 한 번뿐인 오탐은 무시한다.

## 리뷰 범위

- diff에 들어온 줄만 지적한다. diff 밖의 기존 코드는 이번 변경이 그 코드를 깨뜨릴 때만 지적한다.
- 외부 SDK(Polar, Supabase, Anthropic)의 필드나 동작에 대한 지적은 `node_modules`의 실제 타입·코드로 확인한 뒤에만 한다.
- 확신이 없으면 심각도를 한 단계 낮춘다. 🔴는 "누가 어떻게 악용·손해를 보는지"를 한 문장으로 쓸 수 있을 때만 단다.

## 심각도 4단계

| 단계 | 뜻 | FinSight 예시 |
|---|---|---|
| 🔴 critical | 보안 사고·결제 오류·데이터 유출로 바로 이어진다. 머지 금지 | 클라이언트 번들에 `SUPABASE_SERVICE_ROLE_KEY` 노출 / 새 테이블에 RLS 없음 / `?success=1`로 Pro 판단 / 웹훅 서명 검증 없이 `profiles.plan` 변경 |
| 🟠 major | 화면에 틀린 값이 나오거나 규칙을 어겨 사용자가 손해를 본다. 고친 뒤 머지 | 금액을 `number`·`parseFloat`로 계산 / AI 응답에서 받은 합계를 그대로 표시 / 업로드 원본을 저장 / 같은 웹훅이 두 번 오면 결과가 달라짐 |
| 🟡 minor | 동작은 맞지만 프로젝트 규칙·유지보수성을 어긴다. 머지 가능 | 새 로직에 테스트 없음 / 영어 UI 문구 / `@theme` 토큰 대신 임의 색·크기 / 폴더 배치 위반 |
| ⚪ nit | 취향·표기 수준. 고치지 않아도 된다 | 변수명 / 주석 오탈자 / import 순서 / 불필요한 빈 줄 |

## 출력 포맷

### 인라인 코멘트 (지적 1건 = 4줄, `파일:줄`에 단다)

````
[🟠 major] 금액을 부동소수점으로 합산
TL;DR: `Number(amount)`로 더하면 큰 금액에서 원 단위 오차가 생긴다.
✓ Good: 합계를 AI가 아니라 코드에서 계산한 방향은 맞다.
→ Fix:
```ts
const total = rows.reduce((sum, r) => sum + r.amount, 0n);
```
````

- 1줄: `[심각도 이모지 단계] 제목`
- 2줄: `TL;DR:` 무엇이 왜 문제인지 한 문장
- 3줄: `✓ Good:` 이 변경에서 맞게 한 점 한 가지
- 4줄: `→ Fix:` 다음에 붙여넣을 수 있는 코드 블록. 말로만 쓰지 않는다.

### PR 요약 (PR당 1개)

```
## review-code 요약
판정: Changes Requested

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 0 | 1 | 2 | 1 |

### 🔴🟠 지적
- [🟠 major] src/lib/report/total.ts:12 금액을 부동소수점으로 합산

GATE: critical=0 major=1 minor=2 nit=1
```

- 판정: critical ≥ 1 → `Blocked`, major ≥ 1 → `Changes Requested`, 그 외 → `Approve`
- 목록에는 🔴🟠만 적는다. 🟡⚪는 집계와 인라인 코멘트로만 남긴다.
- 마지막 줄 `GATE:`는 게이트가 파싱하는 줄이다. 형식을 바꾸지 않는다.

## 룰

각 룰은 `차원 / 기본 심각도 / 탐지 신호 / 예시`로 적는다. 탐지 신호에 걸리지 않는 코드는 그 룰로 지적하지 않는다.

### R1. 비밀값은 서버에만 — security / 🔴

- 탐지 신호
  - `NEXT_PUBLIC_` 이름에 `ANTHROPIC`, `SERVICE_ROLE`, `POLAR`가 들어감
  - `"use client"` 파일이 `@/lib/supabase/admin`, `@/services/*`를 import하거나 `process.env.ANTHROPIC_API_KEY`·`SUPABASE_SERVICE_ROLE_KEY`·`POLAR_*`를 읽음
  - 비밀값을 읽는 새 모듈에 `import "server-only"`가 없음
- 나쁨: `// "use client"` 컴포넌트에서 `createAdminClient()` 호출
- 좋음: `app/api/**/route.ts`에서 호출하고 클라이언트는 그 라우트를 `fetch`

### R2. 사용자 데이터 테이블은 RLS로 본인 행만 — security / 🔴

- 탐지 신호
  - `supabase/migrations/`의 `create table public.*`에 짝이 되는 `enable row level security`가 없음
  - 정책 조건이 `auth.uid() = user_id`(또는 `id`)가 아님. `using (true)` 포함
  - `profiles`나 `usage`에 `insert`·`update` 정책을 추가함. 두 테이블은 웹훅·`security definer` RPC만 바꾼다
- 나쁨: `create policy ... on public.usage for update using (auth.uid() = user_id);`
- 좋음: `usage` 변경은 `commit_analysis` RPC 안에서만

### R3. Pro 여부는 `profiles.plan`으로만 — security / 🔴

- 탐지 신호
  - `searchParams`(`checkout_id`, `success` 등), 쿠키, 요청 body 값으로 `plan`을 정하거나 Pro 기능을 연다
  - 웹훅 라우트가 아닌 곳에서 admin 클라이언트로 `profiles.plan`을 `update`
- 나쁨: `const isPro = searchParams.get("success") === "1";`
- 좋음: `const { plan } = await getSessionPlan();`

### R4. 웹훅은 서명을 검증한 뒤 처리 — security / 🔴

- 탐지 신호: 웹훅 라우트가 `Webhooks({ webhookSecret })`(또는 `validateEvent`)를 거치지 않고 `request.json()`·`request.text()` 결과로 바로 DB를 바꿈. `webhookSecret`이 빈 값일 수 있는 코드
- 나쁨: `const event = await request.json(); await applyEvent(event);`
- 좋음: 현재 `src/app/api/webhooks/polar/route.ts`처럼 `Webhooks({ webhookSecret: process.env.POLAR_WEBHOOK_SECRET!, ... })`

### R5. 웹훅 처리는 멱등해야 한다 — correctness / 🟠

- 탐지 신호: 웹훅 핸들러에 이벤트 id 기준 중복 체크가 없어, 같은 이벤트가 두 번 오면 결과가 달라질 수 있음
- 예외: 상태를 덮어쓰는 웹훅(`update({ plan })`처럼 절대값을 씀)은 같은 이벤트가 두 번 와도 결과가 같아 본질적으로 멱등이다. 누적·증가하는 웹훅(`insert`, `count + 1`)만 중복 체크를 요구한다.
- 나쁨: 이벤트마다 `insert`하거나 `count + 1`
- 좋음: 이벤트 id로 이미 처리한 이벤트를 건너뜀

### R6. 금액은 코드가 원 단위 정수로 계산 — correctness / 🟠

- 탐지 신호
  - 금액에 `number` 산술, `parseFloat`, `Number(...)`, `/ 100`, `toFixed` 사용 (금액은 `bigint`)
  - AI 응답 zod 스키마(`src/services/claude.ts`)에 금액 **값**(합계, 평균, 원 단위 숫자) 필드를 추가. 열 위치를 가리키는 인덱스(`amountCol`)는 금액 값이 아니다
  - AI가 쓴 문장 속 숫자를 화면의 금액·건수·증감률로 그대로 표시
- 나쁨: `const total = rows.reduce((s, r) => s + Number(r.amount), 0);`
- 좋음: `rows.reduce((s, r) => s + r.amount, 0n)`, AI 응답은 거래 id로만 참조

### R7. 업로드 원본은 저장하지 않는다 — security / 🟠

- 탐지 신호: 업로드 파일이나 파싱 전 원본 행을 Supabase Storage·`fs.writeFile`·DB에 저장. 날짜·가맹점·금액 외의 열(카드번호, 이름 등)을 `transactions`나 로그에 남김
- 나쁨: `await supabase.storage.from("uploads").upload(file.name, file);`
- 좋음: 메모리에서 파싱해 필요한 세 열만 넘긴 뒤 버림

### S. 일반 웹 취약점 — security / 아래 정규화 표

R1~R7에 걸리지 않는 보안 문제는 Claude Code 공식 플러그인 `security-guidance`(Apache-2.0)의 취약점 분류 중 FinSight에 해당하는 아래 항목으로 본다. diff 단위로만 본다. 코드베이스 전체 스캔은 이 리뷰의 범위가 아니다.

| 분류 | FinSight 탐지 신호 |
|---|---|
| 권한 누락(IDOR) | `app/api/**`에서 요청 값(`id`, `userId`)으로 행을 찾으면서 세션 사용자로 범위를 좁히지 않음. admin 클라이언트로 사용자 데이터를 조회 |
| 위조 가능한 값으로 인증 | 헤더·쿼리·body의 사용자 id·역할을 세션 대신 신뢰 |
| 비밀값·개인정보가 로그·URL·오류에 | `console.log`·오류 응답·쿼리스트링에 토큰, 거래 원문, 이메일, 비밀값 |
| 하드코딩된 비밀값 | `sk-ant-`, `sk_`, `polar_`, JWT 같은 값이 소스·워크플로 YAML에 |
| XSS | `dangerouslySetInnerHTML`, AI 응답·가맹점명을 HTML·Markdown으로 직접 조립 |
| 오픈 리다이렉트 | `redirect()`·`NextResponse.redirect()`에 요청 값(`next`, `returnTo`)을 검증 없이 사용 |
| OAuth 흐름 약점 | `auth/callback`에서 `code`·`next` 처리 누락, state 검증 우회 |
| SSRF | 사용자 값이 들어간 URL로 서버가 `fetch` |
| 동적 코드 실행 | `eval`, `new Function`, 사용자 값이 들어간 `child_process` |
| 직렬화로 과다 노출 | Supabase 행을 `select("*")`로 받아 통째로 클라이언트에 반환 |
| GitHub Actions 위험 | `${{ github.event.pull_request.title }}` 같은 PR 값을 `run:`에 직접 삽입. 서드파티 action을 SHA가 아닌 태그로 고정 |
| 위험한 자원 소모 | 업로드·파싱에 쪽 수·행 수·크기 상한이 없어 한 요청이 서버를 오래 점유 |

플러그인 등급을 이 파일의 4단계로 바꾸는 표. R1~R7에 해당하면 그 룰의 심각도가 우선한다.

| 플러그인 | 이 파일 | 기준 |
|---|---|---|
| critical | 🔴 critical | 원격 실행, 인증 우회, 다른 사용자 데이터 유출 |
| high | 🟠 major | 조건이 붙는 IDOR·XSS·인젝션, 비밀값 노출 |
| medium | 🟡 minor | 심층 방어 부족(헤더, CSRF, 자원 상한) |
| low | ⚪ nit | 권장 사항. 플러그인도 오탐이 많아 버리는 등급이라 지적하지 않아도 된다 |

### R8. 프로젝트 관례 — conventions / 🟡

- 탐지 신호
  - 폴더 배치: 컴포넌트가 `src/components/` 밖, 타입이 `src/types/` 밖, 순수 로직이 `src/lib/` 밖, 외부 API 래퍼가 `src/services/` 밖
  - 화면 문구가 영어(`Get started`, `Upgrade`, `Submit` 등)
  - `globals.css`의 `@theme` 토큰 대신 임의 값(`text-[13px]`, `bg-[#00c471]`, 인라인 `color: #...`)
  - `src/lib/`·`src/services/`에 새 함수를 넣었는데 대응하는 `*.test.ts`가 없음
- 좋음: `text-title-md`, `text-ink`, `bg-primary` 같은 토큰 클래스, 해요체 한국어 문구

### R9. 웹훅은 Pro 상품의 구독만 플랜에 반영 — security / 🟠

- 탐지 신호: Polar 웹훅 처리(`src/app/api/webhooks/`, `src/lib/billing/`)가 `profiles.plan`을 바꾸는데, 그 경로에 이벤트의 `product_id`를 `POLAR_PRO_PRODUCT_ID`와 비교하는 검사가 없음. `applySubscriptionEvent`를 거치지 않고 핸들러에서 직접 `update`하는 새 코드가 대표적이다
- 나쁨: `if (event.type === "subscription.active") await updatePlan(userId, "pro");` (상품 확인 없이 이벤트 종류만 봄)
- 좋음: `if (event.data.product_id !== proProductId) return;` 뒤에 플랜 변경. 새 핸들러는 `applySubscriptionEvent`를 거치게 해 검사를 한 곳에 둔다
- 근거: 같은 Polar 조직의 다른 상품 구독이 Pro를 켜고 끄던 버그(4c944a7). "나중에 상품이 늘면 문제"가 아니라 이미 겪은 일이므로 🟡로 낮추지 않는다

### R10. Supabase 쓰기 결과의 `error`를 확인 — correctness / 🟠

- 탐지 신호: `.insert`·`.update`·`.upsert`·`.delete`·`.rpc` 결과를 `await`만 하고 `error`를 확인하지 않음. supabase-js는 실패해도 예외를 던지지 않고 `{ error }`를 돌려준다(`shouldThrowOnError` 기본값 false). 웹훅이면 실패해도 200을 돌려줘 Polar가 재시도하지 않는다
- 나쁨: `await admin.from("profiles").update({ plan }).eq("id", userId);`
- 좋음: `const { error } = await admin.from("profiles").update({ plan }).eq("id", userId); if (error) throw error;`
- 해당 없음: 읽기(`select`)는 결과를 쓰므로 이 룰이 아니라 일반 에러 처리로 본다
