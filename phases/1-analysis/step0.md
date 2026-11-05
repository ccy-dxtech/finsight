# Step 0: supabase-schema

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: RLS, plan/usage 쓰기 금지)
- `/docs/ARCHITECTURE.md` ("데이터 모델", "분석" 7단계)
- `/docs/ADR.md` (ADR-002, 004, 008, 009, 011)
- `/docs/PRD.md` ("저장", "데이터 전체 삭제")
- `/src/types/` (Report, ReportTotals, ReportInsights 형태)

## 작업

`supabase/migrations/`에 SQL 마이그레이션 파일(예: `0001_init.sql`)을 만든다. 이 step은 SQL 파일 작성까지다. 실제 Supabase 프로젝트에 적용하지 않는다(사용자가 수동으로 한다).

1. 테이블 (ARCHITECTURE.md "데이터 모델"과 컬럼명 일치):
   - `profiles(id uuid pk references auth.users, plan text not null default 'free' check in ('free','pro'), updated_at)`
   - `reports(id, user_id, file_name, period_start, period_end, transaction_count, excluded_count, totals jsonb, insights jsonb, created_at)`
   - `transactions(id, user_id, occurred_on date, merchant, amount bigint, category)` — 중복 확인 조회용 인덱스 `(user_id, occurred_on)`
   - `usage(user_id, month date, count int, primary key (user_id, month))`
2. 가입 트리거: `auth.users` insert 시 `profiles` 행을 plan='free'로 생성한다.
3. RLS: 모든 테이블 `enable row level security`.
   - `profiles`: 본인 SELECT만. INSERT/UPDATE/DELETE 정책을 만들지 않는다.
   - `reports`, `transactions`: 본인 SELECT·DELETE만. INSERT/UPDATE 정책을 만들지 않는다(RPC 경유).
   - `usage`: 본인 SELECT만.
   - 정책은 `auth.uid() = user_id`(profiles는 `id`) 기반이다.
4. RPC `commit_analysis(p_report jsonb, p_transactions jsonb, p_month date) returns uuid` — `security definer`, `set search_path = public`, `auth.uid()` 사용. 한 트랜잭션에서 reports 1행 INSERT → transactions INSERT(jsonb 배열 전개) → usage upsert(+1) 후 report id 반환. `auth.uid()`가 null이면 예외. 한도·중복 판단 로직은 넣지 않는다(라우트가 판단). `user_id`는 인자로 받지 말고 항상 `auth.uid()`를 쓴다.
5. RPC 실행 권한: `public`에서 revoke하고 `authenticated`에게만 grant한다.
6. SQL 정적 검증 테스트 `supabase/migrations/schema.test.ts`: 마이그레이션 파일을 문자열로 읽어 (a) 4개 테이블 모두 `enable row level security`가 있는지, (b) `profiles`/`usage`에 INSERT·UPDATE·DELETE 정책이 없는지, (c) `commit_analysis`가 `security definer`이고 `auth.uid()`를 쓰는지, (d) 인자에 `user_id`가 없는지 확인한다. (테스트 파일을 먼저 작성한다. vitest include에 `supabase/**/*.test.ts`가 없으면 추가한다.)

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `profiles.plan`과 `usage`를 사용자 세션으로 쓸 수 있는 정책이 없는가?
   - 모든 사용자 데이터 테이블에 RLS가 켜져 있는가?
   - RPC가 `auth.uid()`만 사용하고 클라이언트가 user_id를 지정할 수 없는가?
3. 결과에 따라 `phases/1-analysis/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 웹훅 기록 테이블, 작업 큐/상태 테이블을 만들지 마라. 이유: ADR-004, 008에서 두지 않기로 했다.
- `usage`/`profiles`에 사용자 쓰기 정책을 추가하지 마라. 이유: 사용자가 플랜·횟수를 조작할 수 있게 된다.
- RPC 안에 한도·중복 판단을 넣지 마라. 이유: 판단은 라우트/순수 함수 한 곳에서 한다(ADR-009, 011).
- 원본 파일 내용을 저장하는 컬럼을 만들지 마라. 이유: ADR-007.
- 기존 테스트를 깨뜨리지 마라.
