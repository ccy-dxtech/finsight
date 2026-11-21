## B. 논의 (가정으로 대체)

1. `profiles`에 `id`(auth.users 참조)와 `plan text default 'free'`가 이미 있다고 가정한다. 로그인과 `profiles` 자동 생성은 끝난 상태다. 결제 코드와 Polar 관련 컬럼·테이블만 새로 만든다.
2. 결제한 사용자와 Supabase 사용자의 연결은 체크아웃 때 `externalCustomerId`(= Supabase user id)로 한다. 웹훅은 이 값으로 `profiles` 행을 찾는다. 이메일로는 매칭하지 않는다.
3. 웹훅에서 `profiles.plan`을 바꿀 때는 service role을 쓴다. 서버 전용 모듈에서만 쓰고, 사용자는 `profiles.plan`을 직접 쓸 수 없게 RLS를 유지한다.
4. 승격은 `subscription.active` 이벤트에서 한다. 이때 `product_id`가 환경변수 `POLAR_PRO_PRODUCT_ID`와 같을 때만 pro로 바꾼다. 다른 상품은 무시한다.
5. "해지되면 free"는 `subscription.revoked`(실제 종료 시점)에서 처리한다. `subscription.canceled`는 기간 말까지 Pro가 유지되므로 plan을 바꾸지 않는다. 해지를 되돌리는 `subscription.uncanceled`도 plan을 바꾸지 않는다.
6. 웹훅은 재전송되거나 순서가 뒤바뀔 수 있다. 처리한 이벤트 id를 `webhook_events`에 기록해 중복 처리를 막는다. 같은 이벤트를 두 번 받아도 결과가 같게(멱등) 만든다.
7. 결제 성공 리다이렉트(`?checkout_id=`)는 plan 판단에 쓰지 않는다. 성공 페이지는 "결제 확인 중"이라고 안내만 하고, `profiles.plan`을 다시 읽어 Pro 여부를 보여 준다.
8. 이미 Pro인 사용자는 체크아웃을 막아 중복 구독을 방지한다. 비로그인 사용자는 401을 돌려준다.
9. 월 1,000원 가격은 Polar sandbox 대시보드에서 만든 상품에 있다. 코드에는 금액을 하드코딩하지 않는다. sandbox가 KRW를 지원하는지는 사람이 확인해야 하므로, 안 되면 해당 step을 `blocked`로 둔다.
10. 환경변수는 `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`, `POLAR_SERVER=sandbox`이다. 모두 `NEXT_PUBLIC_` 없이 서버에서만 읽는다.
11. Next.js는 학습 데이터와 다른 버전이다. 각 step은 `node_modules/next/dist/docs/`의 라우트 핸들러 문서를 먼저 읽는다. `@polar-sh/nextjs`의 `Checkout`·`Webhooks` 시그니처도 `node_modules`의 실제 타입으로 확인한다.
12. phase 이름은 `4-polar-payment`로 한다. 브랜치는 `feat-4-polar-payment`가 된다.

## C. Step 설계 초안 (phase: `4-polar-payment`)

| step | name | 한 줄 작업 | AC 커맨드 |
|---|---|---|---|
| 0 | `billing-schema` | Supabase 마이그레이션 SQL을 추가한다. `profiles`에 `polar_customer_id`와 `polar_subscription_id`를 더하고, 이벤트 id를 기록하는 `webhook_events`(RLS 켬, 사용자 정책 없음)를 만든다. `profiles.plan`은 사용자가 UPDATE할 수 없게 하고, 스키마 파일을 검증하는 테스트를 쓴다. | `npm test -- billing-schema && npm run build` |
| 1 | `plan-rules` | 순수 로직 `src/lib/polar-plan.ts`를 TDD로 만든다. `resolvePlanChange(event, proProductId): {userId, plan} \| null`은 `subscription.active`+Pro 상품이면 pro, `subscription.revoked`이면 free를 돌려주고, 나머지 이벤트와 다른 상품은 null을 돌려준다. | `npm test -- polar-plan && npm run lint` |
| 2 | `polar-service` | `server-only`를 쓰는 `src/services/polar.ts`와 `src/services/billing.ts`를 만든다. env 검증, `applyPlanChange(userId, plan, eventId)`가 중복 이벤트를 건너뛰고 service role로 `profiles.plan`을 갱신한다. Supabase는 목(mock)으로 테스트한다. | `npm test -- billing && npm run build` |
| 3 | `webhook-route` | `app/api/webhooks/polar/route.ts`를 만든다. `@polar-sh/nextjs`의 `Webhooks`로 서명을 검증하고 `plan-rules`와 `billing`으로 처리한다. 서명이 틀리면 거부하고, 모르는 이벤트는 200을 돌려준다. 같은 이벤트를 두 번 보내는 테스트와 다른 상품 무시 테스트를 넣는다. | `npm test -- webhook && npm run build && npm run lint` |
| 4 | `checkout-route` | `app/api/checkout/route.ts`를 만든다. 로그인 사용자를 확인하고, 이미 Pro이면 409로 막고, `externalCustomerId`=user id로 Polar 체크아웃 URL을 만들어 리다이렉트한다. 성공 URL은 파라미터를 신뢰하지 않는 안내 페이지다. | `npm test -- checkout && npm run build` |
| 5 | `upgrade-ui` | 요금제 화면의 "Pro 구독하기(월 1,000원)" 버튼과 결제 후 "결제 확인 중" 상태를 만든다. 둘 다 `profiles.plan`만 읽어 Pro 여부를 보여 주고, 문구는 한국어로 쓴다. `docs/design-system/`과 `docs/UX_GUIDE.md`의 다음 행동 규칙을 따른다. | `npm test && npm run build && npx playwright test tests/e2e/s-payment.spec.ts` (env나 Supabase가 없으면 summary에 "E2E 미실행"이라고 적는다) |
| 6 | `payment-e2e` | Polar sandbox 웹훅을 시뮬레이션해 결제 → Pro 승격 → 해지(revoked) → Free 복귀 흐름을 `tests/e2e/s-payment.spec.ts`로 작성한다. 수동 절차는 `docs/OPERATIONS.md`에 한 줄 추가한다. | `npx playwright test tests/e2e/s-payment.spec.ts && npm test` |
| 7 | `phase-review` | `git diff main...HEAD`를 `/.claude/commands/review.md`로 리뷰해 `phases/4-polar-payment/review.md`에 적는다. 코드는 고치지 않는다. | `test -s phases/4-polar-payment/review.md && git diff --exit-code -- src tests` |

step마다 지킬 주의사항(각 step 파일의 금지사항에 넣는다):

- 웹훅 서명 검증을 생략하거나 `NEXT_PUBLIC_` 변수에 비밀값을 넣지 않는다. 이유: 누구나 plan을 바꿀 수 있게 된다.
- 리다이렉트 파라미터나 클라이언트 값으로 Pro를 판단하지 않는다. 이유: 아키텍처 CRITICAL 규칙이다.
- `subscription.canceled`에서 free로 바꾸지 않는다. 이유: 이미 낸 기간이 남아 있다.
- 금액을 코드에 하드코딩하지 않는다. 이유: 가격의 출처는 Polar 상품이다.