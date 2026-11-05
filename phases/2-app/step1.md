# Step 1: ui-landing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: UI 작업 전 디자인 시스템 읽기)
- `/docs/PRD.md` ("요금제", "화면" `/`, "사용자 흐름: 진입과 구독")
- `/docs/ARCHITECTURE.md` ("화면과 컴포넌트", "결제")
- `/docs/UI_GUIDE.md` (전체, 특히 "디자인 시스템과 다르게 정한 것", "레이아웃")
- `/docs/design-system/README.md`, `/docs/design-system/tokens.css`
- `/docs/design-system/components/Hero/README.md`, `preview.html`
- `/docs/design-system/components/StepList/README.md`, `preview.html`
- `/docs/design-system/components/PricingTier/README.md`, `preview.html`
- 이전 step의 `src/components/Button.tsx`, `Badge.tsx`, `Notice.tsx`, `src/app/page.tsx`, `src/app/globals.css`

## 작업

테스트를 먼저 쓴다(`renderToStaticMarkup`).

1. `Hero`: props `{ isLoggedIn: boolean }`. **좌측 정렬**(가운데 정렬 금지). 로그인 전 "시작하기"(→ `/login`), 로그인 후 "대시보드로 가기"(→ `/dashboard`). 주요 버튼은 하나.
2. `StepList`: 사용 방법 3단계(로그인 → 명세서 업로드 → AI 리포트 확인).
3. `PricingTier`: props `{ tier: "free" | "pro"; priceLabel: string; ... }`. 무료/프로 비교(월 분석 3회/30회, 리포트 모델 차이는 "더 깊은 분석" 수준으로 표현, 월별 추이는 프로만). 프로 버튼 "프로 구독하기"는 `/api/checkout`으로 연결. 결제 버튼 바로 아래에 항상 "테스트 결제 환경이며 실제로 청구되지 않습니다". 가격 문구는 prop으로 받는다(`NEXT_PUBLIC_PRO_PRICE_LABEL`을 page에서 읽어 전달).
4. `src/app/page.tsx`(Server Component): Supabase 세션으로 로그인 여부를 읽어 `Hero` → `StepList` → `PricingTier` → 푸터(간단한 서비스명) 순서로 놓는다. 본문 최대 너비 1200px, 섹션 위아래 `space-section`.
5. 없는 것: 샘플 리포트 미리보기, FAQ(MVP 제외).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 히어로가 좌측 정렬이고, "Get started"/"Upgrade" 등 영어 UI 문구가 없는가?
   - 요금제·결제 버튼 근처에 테스트 결제 문구가 있는가?
   - 컴포넌트가 props만 받는 동기 함수이고 데이터 읽기는 `page.tsx`에 있는가?
3. 결과에 따라 `phases/2-app/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- "Powered by AI" 배지, 그라데이션 텍스트, 배경 orb, 이모지 장식을 넣지 마라. 이유: UI_GUIDE 안티패턴.
- 가운데 정렬 히어로를 만들지 마라. 이유: ADR-015에서 좌측 정렬로 정했다.
- 가격·플랜 판단을 클라이언트 값이나 쿼리로 하지 마라. 이유: 플랜은 `profiles.plan`만 기준이다.
- 기존 테스트를 깨뜨리지 마라.
