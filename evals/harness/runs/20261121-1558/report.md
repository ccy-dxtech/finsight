# 하네스 Eval 20261121-1558

| 케이스 | GATE 줄 | gate | judge | 최종 | 비용(USD) | 시간(s) |
|---|---|---|---|---|---|---|
| 01-review-rls-missing | critical=1 major=0 minor=0 nit=0 | ✓ | pass | **pass** | 0.20 | 24 |
| 02-scan-service-role-public | critical=2 major=1 minor=3 nit=0 | ✓ | pass | **pass** | 1.13 | 118 |
| 03-harness-payment-spec | 없음 | - | pass | **pass** | 0.15 | 34 |
| 04-review-clean-no-fp | critical=0 major=0 minor=0 nit=0 | ✓ | pass | **pass** | 0.18 | 18 |
| 05-claude-md-service-role | critical=1 major=1 minor=1 nit=0 | ✓ | pass | **pass** | 0.21 | 27 |

pass 5 · fail 0 · review 0 · 총 비용 $1.87

## judge 판정 근거

- **01-review-rls-missing** (pass): 유일한 critical 지적은 supabase/migrations/0004_report_notes.sql:2의 "`report_notes`에 RLS가 없고 `authenticated`에 select·insert·delete를 부여함"이다. 이 지적은 `enable row level security`와 정책이 빠진 점을 R2 근거로 들었고, 본인 행에만 허용하는 정책(`auth.uid() = user_id`)을 수정안으로 제시해 기대 동작을 만족한다. RLS 누락 말고 다른 이유로 붙은 critical은 없다.
- **02-scan-service-role-public** (pass): 기대 동작을 충족합니다. 하네스 출력에 기대한 지적 두 건이 모두 있습니다. 하나는 '[🔴 critical] A02 · src/lib/supabase/admin.ts:7 service role 키를 `NEXT_PUBLIC_` 변수에서도 읽음'이고, 다른 하나는 '[🔴 critical] A02 · .env.example:3'입니다. 두 건 모두 JSON에 rule R1, severity critical로 기록돼 있습니다. A08 웹훅이나 A06 같은 다른 지적이 함께 있어도 결과에는 영향이 없습니다.
- **03-harness-payment-spec** (pass): 서명 검증이 step 3 `webhook-signature`라는 독립 step으로 나뉘어 있고, 플랜 갱신 step 4와도 분리돼 있습니다. 이 step은 서명이 틀리거나 없으면 403을 반환하고 DB 호출이 0회임을 테스트로 고정합니다. `validateEvent`라는 이름은 명시되지 않았지만 `POLAR_WEBHOOK_SECRET`은 step 1에서 다룹니다. 마지막 step 6은 `phase-review`이고, 출력은 "파일은 만들거나 고치지 않았습니다"라고 밝히고 있습니다.
- **04-review-clean-no-fp** (pass): 하네스 출력의 판정은 Approve이고, 요약 표와 GATE 줄 모두 critical=0, major=0입니다. '확인한 내용'에서도 `src/lib/format.ts` 위치, `format.test.ts`가 짝으로 있는 점(R8), 한국어 문구 "건"을 정상으로 짚었으므로 기대 동작을 만족합니다.
- **05-claude-md-service-role** (pass): 하네스 출력은 src/components/PlanBadge.tsx:3에서 `"use client" 컴포넌트가 createAdminClient()를 사용`한다는 문제를 🔴 critical로 지적했습니다. 근거로 R1을 들며 service role 키가 노출되면 RLS가 우회된다고 설명해 기대 동작을 충족합니다. 판정도 Blocked이고 JSON comments의 severity도 critical로 일치합니다.
