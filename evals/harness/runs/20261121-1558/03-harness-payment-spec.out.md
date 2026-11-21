# Polar 결제 연동 phase 설계 초안 (`polar-payment`)

탐색 없이 요청 설명과 `AGENTS.md`의 규칙만으로 작성했고, 파일은 만들거나 고치지 않았습니다.

## B. 논의 대신 적는 가정

1. **Pro 판단은 웹훅만 쓴다.** `profiles.plan`은 Polar 웹훅이 서비스 롤 RPC로만 바꿉니다. 결제 성공 리다이렉트 파라미터나 클라이언트 값은 믿지 않습니다.
2. **사용자와 구독 연결.** 체크아웃을 만들 때 `externalCustomerId`에 Supabase `user.id`를 넣고, 웹훅은 이 값으로 `profiles` 행을 찾습니다. 못 찾으면 200으로 응답하고 기록만 남깁니다. 4xx를 주면 Polar가 재시도만 반복하기 때문입니다.
3. **해지 시점.** `subscription.canceled`는 기간 만료 예약입니다. 이때 `plan`은 그대로 pro로 두고, 실제 종료인 `subscription.revoked`가 오면 free로 되돌립니다. 즉시 해지 요구가 있으면 이 가정을 바꿔야 합니다.
4. **상품 확인.** 웹훅 payload의 product id가 `POLAR_PRO_PRODUCT_ID`와 같을 때만 pro로 바꿉니다. 월 1,000원 금액은 Polar sandbox 상품 설정에 두고 코드에는 하드코딩하지 않습니다.
5. **멱등성·순서.** 같은 이벤트가 두 번 와도 결과가 같아야 합니다. 이벤트가 순서 없이 와도 `modified_at`이 더 오래된 이벤트는 무시합니다.
6. **환경.** sandbox만 씁니다. 비밀값은 서버 전용이고 `NEXT_PUBLIC_`에는 넣지 않습니다. 중복 구독 방지는 이미 pro면 체크아웃을 막는 선에서만 합니다.
7. **E2E.** 파일명은 `tests/e2e/`를 확인해 확정하고, `.env.local`이나 Supabase가 없으면 summary에 "E2E 미실행"으로 적습니다.

## C. Step 설계 초안

| step | name | 한 줄 작업 | AC 커맨드 |
|---|---|---|---|
| 0 | `plan-schema` | `profiles`에 `plan`(기본 free)·`polar_customer_id`·`polar_subscription_id`·`plan_event_at` 컬럼을 추가하고, RLS로 사용자의 `plan` 직접 쓰기를 막으며, 웹훅 전용 RPC `apply_subscription_event`(서비스 롤만 실행, 멱등)를 만든다. 마이그레이션 SQL의 테스트부터 작성한다. | `npm run build && npm test` |
| 1 | `polar-service` | `src/services/polar.ts`(`server-only`)와 `src/types/billing.ts`를 만들고, 환경변수(`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRO_PRODUCT_ID`) 검증과 이벤트→plan 변환 순수 함수 `src/lib/billing.ts`를 둔다. | `npm run build && npm test` |
| 2 | `checkout-route` | `app/api/checkout/route.ts`에서 로그인 세션을 확인하고 `externalCustomerId=user.id`로 Polar 체크아웃을 만든다. 비로그인이면 401, 이미 pro면 체크아웃을 만들지 않는다. | `npm run build && npm test` |
| 3 | `webhook-signature` | **보안 경계.** `app/api/webhooks/polar/route.ts`는 서명 검증과 이벤트 파싱까지만 한다. 서명이 틀리거나 없으면 403이고 DB 호출은 0회임을 테스트로 고정하고, 유효한 이벤트는 핸들러 스텁에 넘기기만 한다. | `npm run build && npm test -- webhook-signature` |
| 4 | `webhook-plan-sync` | 핸들러가 `subscription.active`(상품 id 일치)이면 pro로, `subscription.revoked`이면 free로 `apply_subscription_event`를 호출한다. 중복 이벤트 멱등, 오래된 이벤트 무시, 상품 불일치 무시, 미지의 user 처리 테스트를 먼저 쓴다. | `npm run build && npm test -- webhook-plan-sync` |
| 5 | `upgrade-ui` | 한국어 "Pro 업그레이드" 버튼과 성공 복귀 페이지를 만든다. 성공 페이지는 `profiles.plan`을 서버에서 읽어 표시만 하고 리다이렉트 파라미터로 Pro를 판단하지 않는다. 구현 전에 `docs/design-system/`을 읽고, 구현 후 Playwright MCP로 데스크톱·375px 스크린샷과 콘솔 오류를 확인한다. | `npm run build && npm run lint && npm test && npx playwright test tests/e2e/<결제 시나리오>.spec.ts` |
| 6 | `phase-review` | `git diff main...HEAD` 전체를 `review.md` 체크리스트로 리뷰해 `phases/polar-payment/review.md`에 적는다(D-4 템플릿). | `test -s phases/polar-payment/review.md && git diff --exit-code -- src tests` |

설계 메모:
- **step 3과 4를 나눈 이유.** 서명 실패 경로(403, DB 불변)를 처리 로직과 분리해 따로 검증하려는 것입니다(원칙 11).
- **step 0의 RLS.** 마이그레이션은 사용자가 `plan`과 `usage`를 직접 `UPDATE`할 수 없다는 점을 테스트로 고정해야 합니다.
- **금지사항에 넣을 것.**
  - 클라이언트 컴포넌트에서 Polar API를 호출하지 않는다.
  - 성공 리다이렉트로 plan을 바꾸지 않는다.
  - 원본 결제 payload 전체를 저장하지 않는다. 필요한 id와 시각만 저장한다.
- **리뷰 지적이 여럿이면.** `phase-review` 뒤에 `polar-payment-review-fixes` phase를 따로 만듭니다(원칙 10).

이 초안으로 승인하시면 D단계(`phases/index.json`, `phases/polar-payment/index.json`, `step0~6.md`) 파일 생성으로 넘어가겠습니다.