# Step 5: billing-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: Pro 판단은 웹훅이 갱신한 `profiles.plan`만, 비밀값 서버 전용)
- `/docs/PRD.md` ("요금제", "구독 상태" 상태도, "한계")
- `/docs/ARCHITECTURE.md` ("결제 (Polar...)" 전체, "환경 변수")
- `/docs/ADR.md` (ADR-003, 004)
- 이전 step의 `src/lib/supabase/{server,admin}.ts`, `src/lib/auth/safe-next.ts`, `src/proxy.ts`(또는 middleware), `.env.example`

설치된 `@polar-sh/nextjs`의 현재 API(`Checkout`, `CustomerPortal`, `Webhooks`)와 옵션(`server: "sandbox"`, `externalCustomerId` 지정 방식, 웹훅 핸들러 이름 `onSubscriptionActive`/`onSubscriptionRevoked` 등)을 패키지 문서/타입으로 확인한 뒤 작성하라.

## 작업

테스트를 먼저 쓴다. Polar SDK와 Supabase는 모킹한다. 웹훅 로직은 `src/lib/billing/apply-subscription-event.ts`처럼 의존성 주입형 순수에 가까운 함수로 분리해 테스트한다.

1. `src/app/api/checkout/route.ts` (GET): 세션이 없으면 `/login?next=/api/checkout`으로 리다이렉트. 있으면 **서버가 세션의 `user.id`를 external customer id로 지정**하고 `POLAR_PRO_PRODUCT_ID`로 결제를 만들어 Polar 결제 화면으로 리다이렉트. `successUrl`은 `NEXT_PUBLIC_SITE_URL + "/dashboard?checkout=success"`. external customer id/product id는 쿼리 파라미터로 받지 않는다.
2. `src/app/api/portal/route.ts` (GET): 세션 `user.id`로 고객 포털 세션을 만들어 리다이렉트. 세션이 없으면 `/login`.
3. `src/app/api/webhooks/polar/route.ts` (POST): `POLAR_WEBHOOK_SECRET`으로 서명 검증(검증 실패 시 4xx). 이벤트별 동작:
   - `subscription.active` → `profiles.plan = 'pro'`
   - `subscription.revoked` → `profiles.plan = 'free'`
   - `subscription.canceled` → 아무것도 하지 않음(기간 끝까지 Pro)
   - 대상 user는 이벤트의 external customer id로 찾는다. 갱신은 `createAdminClient()`(service role)로만 한다.
4. 테스트: 각 이벤트별 plan 변경/무변경, external id 없는 이벤트 무시, 체크아웃 라우트가 쿼리의 user id를 무시하는지.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `POLAR_*` 값이 `NEXT_PUBLIC_`이나 클라이언트 번들에 없는가? `POLAR_SERVER`는 sandbox인가?
   - `profiles.plan`을 바꾸는 코드가 웹훅 하나뿐인가?
   - 웹훅 서명 검증이 없는 경로가 없는가?
3. 결과에 따라 `phases/2-app/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 결제 성공 리다이렉트나 쿼리 파라미터로 Pro를 판단·부여하지 마라. 이유: 위조 가능, CRITICAL 규칙.
- 웹훅 기록 테이블, 결제 상태 폴링, 웹훅 순서·중복 처리 로직을 추가하지 마라. 이유: ADR-004에서 처리하지 않기로 했다(PRD "한계").
- 실제 Polar API를 호출하는 테스트를 만들지 마라. 이유: 키 의존·비결정성. 모킹만 쓴다.
- 기존 테스트를 깨뜨리지 마라.
