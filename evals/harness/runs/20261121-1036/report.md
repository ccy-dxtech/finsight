# 하네스 Eval 20261121-1036

| 케이스 | GATE 줄 | gate | judge | 최종 | 비용(USD) | 시간(s) |
|---|---|---|---|---|---|---|
| 01-review-rls-missing | critical=1 major=0 minor=1 nit=0 | ✓ | pass | **pass** | 0.20 | 26 |
| 02-scan-service-role-public | critical=2 major=0 minor=2 nit=0 | ✓ | pass | **pass** | 1.04 | 94 |
| 03-harness-payment-spec | 없음 | - | fail | **fail** | 0.32 | 39 |
| 04-review-clean-no-fp | critical=0 major=0 minor=0 nit=0 | ✓ | pass | **pass** | 0.18 | 18 |
| 05-claude-md-service-role | critical=1 major=1 minor=1 nit=0 | ✓ | pass | **pass** | 0.22 | 29 |

pass 4 · fail 1 · review 0 · 총 비용 $1.96

## judge 판정 근거

- **01-review-rls-missing** (pass): 기대 동작을 만족합니다. 유일한 critical 지적은 `supabase/migrations/0004_report_notes.sql:2`의 "새 테이블 `report_notes`에 RLS가 없음"입니다. 근거로 `enable row level security`와 정책 없이 `authenticated`에 grant한 점을 들고 (R2)를 명시했으며, Fix에는 본인 행 정책(`auth.uid() = user_id`)을 제시했습니다. RLS 누락이 아닌 다른 이유로 나온 critical은 없습니다.
- **02-scan-service-role-public** (pass): 하네스 출력은 "[🔴 critical] A02 · src/lib/supabase/admin.ts:7 service role 키를 `NEXT_PUBLIC_` 변수에서 읽음"과 "[🔴 critical] A02 · .env.example:3"을 모두 지적했습니다. JSON 출력에서도 두 지적 모두 owasp "A02", rule "R1", severity "critical"로 분류되어 기대 동작을 충족합니다.
- **03-harness-payment-spec** (fail): 웹훅 서명 검증이 독립된 step으로 나뉘지 않았습니다. step 3 `webhook-route`의 한 줄 작업 안에 "`Webhooks`로 서명을 검증하고 `plan-rules`와 `billing`으로 처리한다"로 웹훅 처리와 함께 들어가 있습니다. 서명이 틀린 경우도 "거부"라고만 적혀 있고, 403 응답과 DB 미변경 검증은 명시되지 않았습니다. 마지막 step이 `phase-review`이고 파일을 만들었다는 주장이 없는 점은 기대와 맞지만, 핵심 기준을 어겨 fail로 판정합니다.
- **04-review-clean-no-fp** (pass): 요약 표와 GATE 줄 모두 critical=0, major=0이고 판정은 Approve입니다. 본문도 `src/lib/format.ts`의 formatCount가 R6(금액 아님)과 R8(src/lib 배치, format.test.ts 동반, '건' 한국어 표시)에 맞는다고 확인했으므로, 정상 변경이라는 기대 동작과 맞고 근거 없는 지적(오탐)도 없습니다.
- **05-claude-md-service-role** (pass): 출력의 `src/components/PlanBadge.tsx:4`에 `[🔴 critical] "use client" 컴포넌트가 service role 클라이언트를 import (R1)` 지적이 있습니다. 근거로 R1을 들었고, `@/lib/supabase/admin`을 쓰면 `SUPABASE_SERVICE_ROLE_KEY`가 브라우저에 노출된다는 점도 밝혀 기대 동작을 그대로 충족합니다.

## 사람 검토 메모

- **03 fail 재현**: `--only 03-harness-payment-spec`로 다시 돌려도 fail(서명 검증이 `webhook-route` step 안에 웹훅 처리·플랜 반영과 함께 들어감). judge 흔들림이 아니라 `/harness`(`.claude/commands/harness.md`)의 step 분해 규칙에 보안 경계 분리 기준이 없어서 생기는 실제 실패로 본다. 하네스 수정 여부는 별도 결정.
- **회귀 게이트 시연**(커밋하지 않고 원복):
  - `.claude/skills/review-code/SKILL.md` 3단계 재조정에 "숫자를 받는 함수가 음수·NaN·소수 입력을 테스트하지 않으면 R6 위반으로 major" 한 문장 추가 → 04 **fail**(GATE major=1, judge fail: 근거 없는 major 오탐).
  - `CLAUDE.md`에 "`supabase/migrations/` SQL은 코드 리뷰에서 지적하지 말 것" 한 줄 추가 → 01 **fail**(GATE critical=0, judge fail: RLS 누락 미지적).
