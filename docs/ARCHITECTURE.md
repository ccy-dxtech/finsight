# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx                  # 루트 레이아웃: <html lang="ko">, Pretendard(pretendard 패키지), globals.css
│   ├── globals.css                 # Tailwind @theme 디자인 토큰 (docs/design-system/tokens.css 값을 옮긴 단일 출처)
│   ├── page.tsx                    # 랜딩
│   ├── error.tsx                   # 한국어 오류 화면(다시 시도 / 대시보드로 가기). 오류 내용은 보여주지 않음
│   ├── not-found.tsx               # 한국어 404(대시보드로 가기)
│   ├── login/page.tsx              # Google 로그인
│   ├── auth/callback/route.ts      # Supabase OAuth 콜백 (세션 교환 후 next 경로로 이동)
│   ├── dashboard/
│   │   ├── layout.tsx              # 로그인 확인, 공통 내비게이션
│   │   ├── page.tsx                # 홈: 업로드 + 남은 횟수 + 최근 리포트
│   │   ├── reports/[id]/page.tsx   # 리포트 상세
│   │   ├── trends/page.tsx         # 월별 추이 (Pro)
│   │   └── settings/page.tsx       # 플랜, 구독 관리, 데이터 삭제, 로그아웃
│   └── api/
│       ├── analyze/route.ts        # POST: 업로드 → 분석 → 저장, 끝나면 JSON 한 번 응답
│       ├── checkout/route.ts       # GET: Polar 결제 화면으로 리다이렉트
│       ├── portal/route.ts         # GET: Polar 고객 포털로 리다이렉트
│       ├── webhooks/polar/route.ts # POST: Polar 웹훅 → profiles.plan 갱신
│       └── data/route.ts           # DELETE: 내 거래·리포트 전체 삭제
├── components/                     # UI 컴포넌트, 디자인 시스템과 같은 이름 (차트 포함, 외부 차트 라이브러리 없음)
├── types/                          # 공용 타입 (Transaction, Report, Plan 등)
├── lib/
│   ├── statement/                  # 디코딩, 파싱, 마스킹, 정규화, 중복 키 (순수 함수)
│   ├── aggregate/                  # 카테고리 합계, 월별 집계, 증감률 (순수 함수)
│   ├── plan.ts                     # 플랜별 한도(Free 3, Pro 30)와 리포트 모델, KST 월 경계
│   ├── categories.ts               # 고정 카테고리 10개 (단일 출처)
│   ├── upload.ts                   # 업로드 파일 형식·크기(4MB) 확인. 클라이언트와 analyze 라우트가 같이 씀
│   ├── format.ts                   # 금액·숫자·날짜·기간·연월 표시
│   ├── report.ts                   # 저장된 리포트 jsonb(문자열 금액)를 bigint로 복원
│   ├── billing/                    # Polar 웹훅 이벤트 → 플랜 변경 판단
│   ├── client/                     # 클라이언트에서 부르는 내부 API(데이터 삭제)
│   └── supabase/                   # server / browser 클라이언트, 세션 갱신 헬퍼, getSessionPlan(세션 + profiles.plan)
├── services/
│   └── claude.ts                   # mapColumns, classifyMerchants, writeReport (server-only)
└── middleware.ts                   # Supabase 세션 갱신, /dashboard 보호 (Next 16+는 proxy.ts)
supabase/
└── migrations/                     # 테이블, RLS 정책, RPC SQL
```
- 테스트는 대상 파일 옆에 `*.test.ts`로 둔다. `scripts/hooks/tdd-guard.sh`는 짝이 되는 테스트 파일이 없으면 `.ts`/`.tsx` 편집을 막는다.

## 패턴
- **컴포넌트**: Server Components가 기본이다. 업로드 폼, 삭제 확인처럼 상호작용이 필요한 곳만 Client Component로 만든다. 차트는 Server Component다.
- **디자인 시스템**: 컴포넌트는 `docs/design-system/components/<이름>/`(README.md 명세 + preview.html 모양)을 기준으로 Tailwind 유틸리티로 만든다. 토큰은 `src/app/globals.css`의 `@theme` 한 곳에만 둔다. 공용 컴포넌트(`Button`, `Badge`, `Notice`)를 먼저 만들고 화면 컴포넌트가 이를 조합한다. 세부 규칙은 `docs/UI_GUIDE.md`.
- **프레젠테이션 컴포넌트**: `src/components/`의 컴포넌트는 props만 받는 동기 함수로 만든다. 데이터 읽기(Supabase)는 `page.tsx`에서 하고 결과를 props로 넘긴다. async 컴포넌트는 아래 정적 렌더링 테스트를 할 수 없다.
- **컴포넌트 테스트**: `Foo.tsx` 옆에 `Foo.test.tsx`를 둔다. Vitest에서 `react-dom/server`의 `renderToStaticMarkup`으로 HTML 문자열을 만들어 문구, aria 속성(`role="status"`, `aria-current` 등), 상태(비활성, 0회, 잠금 등)를 확인한다. Testing Library·jsdom은 쓰지 않고, 클릭·입력 같은 상호작용과 픽셀 모양은 테스트하지 않는다. Vitest 설정에서 `.tsx`를 React automatic JSX로 변환하게 한다.

## 화면과 컴포넌트
컴포넌트 이름은 `docs/design-system/components/`의 폴더 이름과 같다. 위에서 아래 순서로 놓는다.

| 경로 | 컴포넌트 |
|---|---|
| `/` | 헤더(로고 + 보조 `Button`) → `Hero` → `StepList`(`surface-soft` 띠) → `PricingTier`(`#pricing`) → 푸터 |
| `/login` | 가운데 `Button`(Google, 큰 버튼) 하나 |
| `/dashboard/*` 공통 | `AppHeader`(dashboard/layout.tsx) |
| `/dashboard` | `UploadDropzone`(분석 중에는 그 자리에 `AnalyzingState`, 이번 달 횟수를 다 쓰면 그 자리에 `LockedPanel` 소진 카드) → `UsageMeter` → `ReportListItem` 목록 |
| `/dashboard/reports/[id]` | `StatSummary` → `CategoryBars` → `InsightList`(정기결제·이상 지출) → `SavingTip` |
| `/dashboard/trends` | 프로: `MonthlyChart` + `ChangeTable`(거래가 있는 가장 최근 달 vs 그 전달, 전달 거래가 없으면 표 대신 안내) / 무료: `LockedPanel` |
| `/dashboard/settings` | `SettingsRow` 목록(플랜, 구독 관리, 데이터 삭제, 로그아웃) |
| 여러 화면 | `Button`, `Badge`, `Notice`(오류·결제 확인 중·결제 완료 안내) |
- **서버 전용 모듈**: 외부 API와 비밀값을 쓰는 모듈(`services/`, service role 클라이언트)은 `import "server-only"`로 클라이언트 번들 유입을 막는다.
- **플랜 읽기**: 대시보드 layout·page와 `/api/checkout`은 `lib/supabase/session-plan`의 `getSessionPlan()`으로 세션과 `profiles.plan`을 읽는다. React `cache`로 감싸 같은 요청 안에서는 한 번만 조회한다. 로그인하지 않았으면 `null`, 플랜을 읽지 못하면 오류를 던져 `error.tsx`가 받는다.
- **순수 함수**: 파일 처리와 집계 로직은 `lib/`의 순수 함수로 만들고 단위 테스트로 검증한다. 라우트 핸들러는 이 함수들을 조합만 한다.
- **숫자는 코드, 해석은 AI**: 합계·건수·증감률은 `lib/aggregate`가 계산한다. AI 리포트는 거래를 id로 참조하고, 그 id를 날짜·가맹점·금액으로 바꾸는 것은 코드가 한다.
- **런타임**: `api/analyze`는 Node.js 런타임에서 돌린다(SheetJS와 EUC-KR 디코딩 때문). `maxDuration`은 Vercel 플랜 한도 안에서 크게 잡는다.

## 데이터 모델 (Supabase Postgres)
| 테이블 | 주요 컬럼 | 접근 |
|---|---|---|
| `profiles` | `id`(= auth.users.id), `plan`('free'\|'pro'), `updated_at` | 본인 SELECT만. 가입 시 트리거로 생성하고, 변경은 웹훅(service role)만 |
| `reports` | `id`, `user_id`, `file_name`, `period_start`, `period_end`, `transaction_count`, `excluded_count`, `totals`(jsonb, 코드 계산), `insights`(jsonb, AI 문장 + 코드가 채운 거래 정보), `created_at` | 본인 SELECT·DELETE |
| `transactions` | `id`, `user_id`, `occurred_on`(date), `merchant`, `amount`(bigint, 원, 음수 가능), `category` | 본인 SELECT·DELETE. 월별 추이와 중복 확인에만 쓴다 |
| `usage` | `user_id`, `month`(KST 월 1일), `count` | 본인 SELECT만. 데이터 삭제 시에도 남는다 |

- **RPC `commit_analysis`** (security definer, `auth.uid()` 사용): 라우트가 넘긴 리포트 1건과 새 거래 목록을 받아, 한 트랜잭션 안에서 `reports` 1행 INSERT → `transactions` INSERT → `usage` upsert +1을 하고 `report_id`를 반환한다. 판단 로직(한도, 중복)은 넣지 않는다.
- 리포트 상세는 `reports` 한 행만 읽는다. 화면에 필요한 숫자는 `totals`와 `insights`에 다 들어 있다.

## 데이터 흐름

### 분석 (`POST /api/analyze`, multipart 파일 1개)
```
1. 세션 확인(401) → 형식·크기 확인(4MB, `lib/upload.ts`. Vercel 요청 본문 한도 4.5MB 안쪽)
2. 한도 확인: profiles.plan과 이번 달 usage.count를 읽어 한도 이상이면 중단 (한도 확인은 여기 한 곳). 이때 읽은 plan으로 리포트 모델도 정한다
3. 파일 읽기: xls/xlsx는 SheetJS, CSV는 UTF-8(fatal) 실패 시 EUC-KR로 읽어 SheetJS 파싱
   → 상단 10행 마스킹(6자리 이상 숫자) → claude.mapColumns (Haiku)
   → lib/statement 정규화(날짜, 원 단위 정수, 날짜·금액을 못 읽은 행은 제외 카운트)
   → 3,000건 초과·0건이면 중단
4. 중복 확인: 파일 기간의 기존 거래 키를 조회해 새 거래만 골라낸다(lib/statement 순수 함수). 새 거래가 0건이면 "이미 분석한 파일"로 중단
5. 분류: 고유 가맹점명을 200개씩 나눠 claude.classifyMerchants (Haiku, 병렬)
6. 리포트: lib/aggregate로 카테고리 합계·기간 계산 → claude.writeReport (Free는 Sonnet 5.5, Pro는 Opus 5.5)
   → AI가 참조한 거래 id를 코드가 날짜·가맹점·금액으로 바꿔 insights에 넣는다. 없는 id를 참조한 항목은 버린다
7. 저장: commit_analysis RPC(리포트 + 새 거래 + 사용 횟수 +1) → 응답 { reportId }
```
- 응답은 끝났을 때 JSON 한 번이다. 성공은 `200 { reportId }`, 실패는 `4xx/5xx { error: "<code>", message: "<한국어 안내>" }`.
- 클라이언트는 요청하는 동안 스피너를 보여주고, 성공하면 `/dashboard/reports/[id]`로 이동한다.
- 7번 전에 실패하면 DB에 아무것도 쓰지 않는다. 그래서 차감이 없고, 같은 파일로 재시도할 수 있다.
- 거래 id는 요청 안에서만 쓰는 임시 번호(파일의 행 순번)다. DB의 `transactions.id`와 연결하지 않는다.
- 오류 코드: `unsupported_file`, `file_too_large`, `too_many_rows`, `columns_not_found`, `no_transactions`, `already_analyzed`, `quota_exceeded`, `ai_failed`.

### AI 호출 (`services/claude.ts`)
| 함수 | 모델(env) | 입력 | 출력(구조화 출력, zod 스키마) |
|---|---|---|---|
| `mapColumns` | `CLAUDE_MODEL_FAST` | 마스킹된 상단 10행 | `{ headerRowIndex, dateCol, merchantCol, amountCol }`(amountCol은 원화 이용금액 열), 못 찾으면 null |
| `classifyMerchants` | `CLAUDE_MODEL_FAST` | 가맹점명 최대 200개 | `[{ merchant, category }]`, category는 10개 enum |
| `writeReport` | Free `CLAUDE_MODEL_REPORT_FREE`, Pro `CLAUDE_MODEL_REPORT_PRO` | 코드가 계산한 카테고리 합계 + 거래 목록(임시 id, 날짜, 가맹점, 금액, 카테고리) | `{ summary, recurring[{transactionIds, note}], anomalies[{transactionId, reason}], savingTips[{title, detail}] }` |

- **구조화 출력**: `output_config.format`에 zod 스키마를 넣고 결과를 zod로 다시 검증한다. TypeScript SDK는 `client.messages.parse()`와 `@anthropic-ai/sdk/helpers/zod`의 `zodOutputFormat`을 쓴다. 정확한 사용법은 구현 step에서 claude-api 스킬 문서로 확인한다.
- **Haiku 호출**: `output_config.effort: "low"`.
- **리포트 호출 (Sonnet 5.5, Opus 5.5 공통)**: 두 모델 모두 같은 프롬프트, 같은 스키마, 같은 설정을 쓰고 `model`만 다르다.
  - `output_config.effort: "medium"`을 명시한다.
  - thinking은 끌 수 없으므로 파라미터를 생략한다.
  - 입력(거래 목록)과 응답이 길 수 있으니 SDK 스트리밍으로 받고 `finalMessage()`로 한 번에 모은다(브라우저로 스트리밍하지 않음). `max_tokens`는 64000이다.
- **실패 처리**: `stop_reason`이 `refusal`이나 `max_tokens`이거나, 스키마 검증에 실패하면 `ai_failed`로 처리한다. 재시도는 SDK 기본값(2회)에 맡긴다.
- **기타**: 프롬프트 캐싱은 쓰지 않는다. 시스템 프롬프트가 짧아 최소 캐시 길이에 못 미친다. 리포트 프롬프트에는 "금액을 계산해 쓰지 말고 거래 id로 참조하라"는 지시를 넣는다.

### 결제 (Polar, `@polar-sh/nextjs`, `POLAR_SERVER=sandbox`)
```
"프로 구독하기" → /api/checkout (비로그인이면 /login?next=/api/checkout, 이미 프로면 /dashboard/settings)
  → 세션의 user.id를 external customer id로 서버에서 지정하고 POLAR_PRO_PRODUCT_ID로 결제 생성 → Polar 결제 화면
  → successUrl: /dashboard?checkout=success (아직 무료면 "결제 확인 중", 이미 프로면 "프로 구독을 시작했어요" 안내. 플랜 판단은 profiles.plan으로만)
Polar → /api/webhooks/polar (POLAR_WEBHOOK_SECRET 서명 검증, product_id가 POLAR_PRO_PRODUCT_ID인 구독만)
  subscription.active  → profiles.plan = 'pro'
  subscription.revoked → profiles.plan = 'free'
  subscription.canceled → 아무것도 하지 않음 (기간 끝까지 Pro, 끝나면 revoked가 옴)
"구독 관리" → /api/portal (비로그인이면 /login?next=/api/portal) → 세션 user.id로 고객 포털 세션 생성 → Polar 고객 포털 (returnUrl: /dashboard/settings)
```
- external customer id는 쿼리 파라미터로 받지 않는다. 다른 사용자 id를 넣는 것을 막기 위해서다.
- 웹훅은 service role 클라이언트로 `profiles`를 갱신한다. 웹훅 기록 테이블이나 결제 상태 폴링은 두지 않는다.

### 데이터 삭제 (`DELETE /api/data`)
- 사용자 세션으로 본인의 `transactions`와 `reports`를 삭제한다. `profiles`와 `usage`는 남긴다.
- 두 테이블을 따로 지우므로 중간에 실패하면 일부만 지워질 수 있다. 오류 안내는 "일부만 지워졌을 수 있어요"라고 말하고, 다시 시도하면 남은 것이 지워진다(PRD 한계).

## 상태 관리
- 서버 상태는 Server Components에서 Supabase(사용자 세션 + RLS)로 읽는다. 변경 후에는 `router.refresh()`나 이동으로 다시 읽는다.
- 클라이언트 상태는 분석 중 여부와 오류 메시지 정도라서 `useState`로 충분하다. 전역 상태 라이브러리는 쓰지 않는다.

## 환경 변수 (`.env`, git 제외)
| 변수 | 용도 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 클라이언트 | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 웹훅의 profiles 갱신 | 서버 전용 |
| `ANTHROPIC_API_KEY` | Claude API | 서버 전용 |
| `CLAUDE_MODEL_FAST` = `claude-haiku-5-5` | 열 매핑, 분류 | 서버 전용 |
| `CLAUDE_MODEL_REPORT_FREE` = `claude-sonnet-5-5` | Free 인사이트 리포트 | 서버 전용 |
| `CLAUDE_MODEL_REPORT_PRO` = `claude-opus-5-5` | Pro 인사이트 리포트 | 서버 전용 |
| `POLAR_SERVER` = `sandbox`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID` | 결제 | 서버 전용 |
| `NEXT_PUBLIC_SITE_URL` | OAuth·결제 리다이렉트 기준 URL | 공개 |
| `NEXT_PUBLIC_PRO_PRICE_LABEL` = `월 1,000원` | 랜딩·업그레이드 안내의 가격 표시 | 공개 |
