# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx                    # 랜딩
│   ├── login/page.tsx              # Google 로그인
│   ├── auth/callback/route.ts      # Supabase OAuth 콜백 (세션 교환 후 next 경로로 이동)
│   ├── dashboard/
│   │   ├── layout.tsx              # 로그인 확인, 공통 내비게이션
│   │   ├── page.tsx                # 홈: 업로드 + 남은 횟수 + 최근 리포트
│   │   ├── reports/[id]/page.tsx   # 리포트 상세
│   │   ├── trends/page.tsx         # 월별 추이 (Pro)
│   │   └── settings/page.tsx       # 플랜, 구독 관리, 데이터 삭제, 로그아웃
│   └── api/
│       ├── analyze/route.ts        # POST: 업로드 → 분석 → 저장, 진행 상황 스트리밍
│       ├── checkout/route.ts       # GET: Polar 결제 화면으로 리다이렉트
│       ├── portal/route.ts         # GET: Polar 고객 포털로 리다이렉트
│       ├── webhooks/polar/route.ts # POST: Polar 웹훅 → profiles.plan 갱신
│       └── data/route.ts           # DELETE: 내 거래·리포트 전체 삭제
├── components/                     # UI 컴포넌트 (차트 포함, 외부 차트 라이브러리 없음)
├── types/                          # 공용 타입 (Transaction, Report, Plan 등)
├── lib/
│   ├── statement/                  # 디코딩, 파싱, 마스킹, 정규화, 중복 키 (순수 함수)
│   ├── aggregate/                  # 카테고리 합계, 월별 집계, 증감률 (순수 함수)
│   ├── plan.ts                     # 플랜별 한도(Free 3, Pro 30), KST 월 경계
│   ├── categories.ts               # 고정 카테고리 10개 (단일 출처)
│   └── supabase/                   # server / browser 클라이언트, 세션 갱신 헬퍼
├── services/
│   └── claude.ts                   # mapColumns, classifyMerchants, writeReport (server-only)
└── middleware.ts                   # Supabase 세션 갱신, /dashboard 보호 (Next 16+는 proxy.ts)
supabase/
└── migrations/                     # 테이블, RLS 정책, RPC SQL
```
- 테스트는 대상 파일 옆에 `*.test.ts`로 둔다. `scripts/hooks/tdd-guard.sh`는 짝이 되는 테스트 파일이 없으면 `.ts`/`.tsx` 편집을 막는다.

## 패턴
- **컴포넌트**: Server Components가 기본이다. 업로드·진행 표시, 차트 툴팁, 버튼처럼 상호작용이 필요한 곳만 Client Component로 만든다.
- **서버 전용 모듈**: 외부 API와 비밀값을 쓰는 모듈(`services/`, service role 클라이언트)은 `import "server-only"`로 클라이언트 번들 유입을 막는다.
- **순수 함수**: 파일 처리와 집계 로직은 `lib/`의 순수 함수로 만들고 단위 테스트로 검증한다. 라우트 핸들러는 이 함수들을 조합만 한다.
- **숫자는 코드, 해석은 AI**: 합계·건수·증감률은 `lib/aggregate`가 계산한다. AI 리포트는 거래를 id로 참조하고, 화면에 보이는 금액은 저장된 거래에서 가져온다.
- **런타임**: `api/analyze`는 Node.js 런타임에서 돌린다(SheetJS와 EUC-KR 디코딩 때문). `maxDuration`은 Vercel 플랜 한도 안에서 크게 잡는다.

## 데이터 모델 (Supabase Postgres)
| 테이블 | 주요 컬럼 | 접근 |
|---|---|---|
| `profiles` | `id`(= auth.users.id), `plan`('free'\|'pro'), `polar_subscription_id`, `updated_at` | 본인 SELECT만. 가입 시 트리거로 생성하고, 변경은 웹훅(service role)만 |
| `reports` | `id`, `user_id`, `file_name`, `period_start`, `period_end`, `transaction_count`, `excluded_count`, `totals`(jsonb, 코드 계산), `insights`(jsonb, AI), `created_at` | 본인 SELECT·DELETE |
| `transactions` | `id`, `user_id`, `report_id`, `occurred_on`(date), `merchant`, `amount`(bigint, 원, 음수 가능), `category` | 본인 SELECT·DELETE |
| `usage` | `user_id`, `month`(KST 월 1일), `count` | 본인 SELECT만. 데이터 삭제 시에도 남는다 |

- **RPC `commit_analysis`** (security definer, `auth.uid()` 사용): 하나의 트랜잭션 안에서 아래를 처리한다.
  1. `profiles.plan`으로 한도를 확인한다. 이번 달 `usage.count`가 한도 이상이면 오류를 낸다.
  2. `reports`에 1행을 넣는다.
  3. 이전 업로드에 같은 (날짜, 가맹점, 금액)이 없는 거래만 `transactions`에 넣는다. INSERT ... SELECT ... WHERE NOT EXISTS 한 문장으로 처리해서, 같은 파일 안의 겹치는 거래는 모두 들어간다.
  4. `usage`를 upsert로 +1 한다.
  5. `report_id`를 반환한다.
- 한도와 플랜은 클라이언트가 보낸 값이 아니라 RPC 안에서 DB를 읽어 판단한다.

## 데이터 흐름

### 분석 (`POST /api/analyze`, multipart 파일 1개)
```
세션 확인(401) → 형식·크기 확인(5MB) → plan·usage 사전 확인(빠른 실패)
→ [진행: parse]    디코딩: xls/xlsx는 SheetJS, CSV는 UTF-8(fatal) 실패 시 EUC-KR로 읽어 SheetJS 파싱
                    → 상단 10행 마스킹(6자리 이상 숫자) → claude.mapColumns (Haiku)
                    → lib/statement 정규화(날짜, 원 단위 정수, 취소 음수, 해외는 원화 열, 실패 행은 제외 카운트)
                    → 3,000건 초과·0건이면 중단 → 기존 거래 키 조회: 전부 중복이면 "이미 분석한 파일"로 중단
→ [진행: classify] 고유 가맹점명을 200개씩 나눠 claude.classifyMerchants (Haiku, 병렬)
→ [진행: report]   lib/aggregate로 카테고리 합계·기간 계산 → claude.writeReport (Opus 5.5)
→ commit_analysis RPC → [done: reportId]
```
- 응답은 NDJSON 스트림이다. 한 줄에 이벤트 하나: `{"step":"parse"}`, `{"step":"classify"}`, `{"step":"report"}`, `{"done":true,"reportId":"..."}`, `{"error":"<code>","message":"<한국어 안내>"}`.
- 클라이언트는 이벤트로 단계를 표시하고, `done`을 받으면 `/dashboard/reports/[id]`로 이동한다.
- RPC 전에 실패하면 DB에 아무것도 쓰지 않는다. 그래서 차감이 없고, 같은 파일로 재시도할 수 있다.
- 오류 코드: `unsupported_file`, `file_too_large`, `too_many_rows`, `columns_not_found`, `no_transactions`, `already_analyzed`, `quota_exceeded`, `ai_failed`.

### AI 호출 (`services/claude.ts`)
| 함수 | 모델(env) | 입력 | 출력(구조화 출력, zod 스키마) |
|---|---|---|---|
| `mapColumns` | `CLAUDE_MODEL_FAST` | 마스킹된 상단 10행 | `{ headerRowIndex, dateCol, merchantCol, amountCol, krwAmountCol \| null }`, 못 찾으면 null |
| `classifyMerchants` | `CLAUDE_MODEL_FAST` | 가맹점명 최대 200개 | `[{ merchant, category }]`, category는 10개 enum |
| `writeReport` | `CLAUDE_MODEL_SMART` | 코드가 계산한 카테고리 합계 + 거래 목록(id, 날짜, 가맹점, 금액, 카테고리) | `{ summary, categoryComments[{category, comment}], recurring[{transactionIds, note}], anomalies[{transactionId, reason}], savingTips[{title, detail}] }` |

- **구조화 출력**: `output_config.format`에 zod 스키마를 넣고 결과를 zod로 다시 검증한다. TypeScript SDK는 `client.messages.parse()`와 `@anthropic-ai/sdk/helpers/zod`의 `zodOutputFormat`을 쓴다. 정확한 사용법은 구현 step에서 claude-api 스킬 문서로 확인한다.
- **Haiku 호출**: `output_config.effort: "low"`.
- **Opus 5.5 호출**:
  - `output_config.effort: "medium"`을 명시한다.
  - thinking은 끌 수 없으므로 파라미터를 생략한다.
  - 응답이 길 수 있으니 스트리밍으로 받고 `finalMessage()`로 모은다. `max_tokens`는 64000이다.
  - 서버 측 refusal fallback을 켠다(`fallbacks: "default"` + beta `server-side-fallback-2026-07-01`).
- **실패 처리**: `stop_reason`이 `refusal`이나 `max_tokens`이거나, 스키마 검증에 실패하면 `ai_failed`로 처리한다. 재시도는 SDK 기본값(2회)에 맡긴다.
- **기타**: 프롬프트 캐싱은 쓰지 않는다. 시스템 프롬프트가 짧아 최소 캐시 길이에 못 미친다. 리포트 프롬프트에는 "금액을 계산해 쓰지 말고 거래 id로 참조하라"는 지시를 넣는다.

### 결제 (Polar, `@polar-sh/nextjs`, `POLAR_SERVER=sandbox`)
```
"Pro 구독하기" → /api/checkout (비로그인이면 /login?next=/api/checkout)
  → 세션의 user.id를 external customer id로 서버에서 지정하고 POLAR_PRO_PRODUCT_ID로 결제 생성 → Polar 결제 화면
  → successUrl: /dashboard?checkout=success ("결제 확인 중" 안내만 표시, 플랜 판단에는 쓰지 않음)
Polar → /api/webhooks/polar (POLAR_WEBHOOK_SECRET 서명 검증)
  subscription.active  → profiles.plan = 'pro', polar_subscription_id 저장
  subscription.revoked → profiles.plan = 'free'
  subscription.canceled → 아무것도 하지 않음 (기간 끝까지 Pro, 끝나면 revoked가 옴)
"구독 관리" → /api/portal → 세션 user.id로 고객 포털 세션 생성 → Polar 고객 포털
```
- external customer id는 쿼리 파라미터로 받지 않는다. 다른 사용자 id를 넣는 것을 막기 위해서다.
- 웹훅은 service role 클라이언트로 `profiles`를 갱신한다. 웹훅 기록 테이블이나 결제 상태 폴링은 두지 않는다.

### 데이터 삭제 (`DELETE /api/data`)
- 사용자 세션으로 본인의 `transactions`와 `reports`를 삭제한다. `profiles`와 `usage`는 남긴다.

## 상태 관리
- 서버 상태는 Server Components에서 Supabase(사용자 세션 + RLS)로 읽는다. 변경 후에는 `router.refresh()`나 이동으로 다시 읽는다.
- 클라이언트 상태는 업로드 진행 단계와 오류 메시지 정도라서 `useState`로 충분하다. 전역 상태 라이브러리는 쓰지 않는다.

## 환경 변수 (`.env`, git 제외)
| 변수 | 용도 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 클라이언트 | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 웹훅의 profiles 갱신 | 서버 전용 |
| `ANTHROPIC_API_KEY` | Claude API | 서버 전용 |
| `CLAUDE_MODEL_FAST` = `claude-haiku-5-5` | 열 매핑, 분류 | 서버 전용 |
| `CLAUDE_MODEL_SMART` = `claude-opus-5-5` | 인사이트 리포트 | 서버 전용 |
| `POLAR_SERVER` = `sandbox`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID` | 결제 | 서버 전용 |
| `NEXT_PUBLIC_SITE_URL` | OAuth·결제 리다이렉트 기준 URL | 공개 |
| `NEXT_PUBLIC_PRO_PRICE_LABEL` = `월 1,000원` | 랜딩·업그레이드 안내의 가격 표시 | 공개 |
