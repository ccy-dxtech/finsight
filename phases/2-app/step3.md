# Step 3: ui-report

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: 금액은 코드가 계산, 디자인 시스템 읽기)
- `/docs/PRD.md` ("화면" `/dashboard/reports/[id]`, "금액", "핵심 기능" 3번)
- `/docs/ARCHITECTURE.md` ("화면과 컴포넌트", 데이터 모델의 `reports.totals`/`insights`)
- `/docs/ADR.md` (ADR-006, 013, 015)
- `/docs/UI_GUIDE.md` (특히 "차트", "숫자 표시", "AI 문장")
- `/docs/design-system/README.md`, `/docs/design-system/tokens.css`
- `/docs/design-system/components/{StatSummary,CategoryBars,InsightList,SavingTip}/README.md` 와 각 `preview.html`
- 이전 step의 `src/lib/format.ts`, `src/types/`(Report 타입), `src/components/*`, `src/lib/aggregate/`

## 작업

테스트를 먼저 쓴다(`renderToStaticMarkup`).

1. `StatSummary`: props `{ totalAmount; transactionCount; periodStart; periodEnd; excludedCount }` → 총지출, 건수, 기간, "제외 N건"(0이면 표시 방식은 명세를 따름). 모든 숫자는 props로 받은 코드 계산값이다.
2. `CategoryBars`: props `{ rows: { label; amount; ratio }[] }`. 금액 내림차순, 0원 숨김, 비율 표시. 막대 12px 필 모양, `primary` 한 색, 길이는 최댓값 대비 비율, **음수 금액은 막대 없이 금액만**. 툴팁·축·범례 없음. 이 컴포넌트는 step 4의 `MonthlyChart`가 같은 가로 막대 모양을 재사용할 수 있게 행 렌더링을 간단히 분리해도 된다(과한 추상화는 금지).
3. `InsightList`: 정기결제·이상 지출 목록. 각 항목은 날짜·가맹점·금액(코드가 id로 치환해 저장한 값)과 AI의 관찰 문장.
4. `SavingTip`: 절약 제안 `{ title; detail }`.
5. `src/app/dashboard/reports/[id]/page.tsx`(Server Component): `reports` 한 행만 읽어(RLS) `StatSummary` → `CategoryBars` → `InsightList`(정기결제·이상 지출) → `SavingTip` 순서로 놓는다. 본인 것이 아니거나 없으면 `notFound()`. `summary` 문장도 표시한다. 리포트 한 행의 `totals`/`insights`에 필요한 값이 모두 있으므로 `transactions`는 읽지 않는다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 화면의 모든 금액·건수가 DB에 저장된 코드 계산값이고 컴포넌트에서 재계산·AI 생성이 없는가?
   - 차트에 툴팁·축·범례·원형·세로 막대가 없는가?
   - 금액 표기가 `format.ts`를 거치는가?
3. 결과에 따라 `phases/2-app/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 외부 차트 라이브러리를 설치하지 마라. 이유: ADR-013.
- AI 문장 속 숫자를 파싱해 화면 숫자로 쓰지 마라. 이유: AI가 만든 숫자는 화면 숫자가 아니다.
- 리포트 개별 삭제, 카테고리 수정 UI를 만들지 마라. 이유: MVP 제외 사항.
- 기존 테스트를 깨뜨리지 마라.
