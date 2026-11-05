# Step 2: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (요금제, 카테고리, 리포트 규칙)
- `/docs/ARCHITECTURE.md` (데이터 모델, AI 호출 표, 환경 변수)
- `/docs/ADR.md` (ADR-005, 006, 009, 012)
- `/scripts/hooks/tdd-guard.sh` (`types/`는 테스트 없이 편집 가능, `lib/*.ts`는 테스트 필수)
- 이전 step에서 만든 `package.json`, `vitest.config.ts`

## 작업

테스트(`*.test.ts`)를 먼저 작성하고, 통과하는 구현을 작성한다.

1. `src/types/`에 공용 타입을 둔다. 금액은 원 단위 정수이며 DB 컬럼은 `bigint`지만 TS에서는 `number`(안전 정수 범위, 최대 3,000건 합계) 또는 `bigint` 중 하나로 통일하고 이유를 파일 상단 주석 한 줄로 남긴다. 부동소수점 연산·소수 금액은 금지한다.
   - `Plan = "free" | "pro"`
   - `Category`(아래 categories.ts에서 파생)
   - `Transaction { occurredOn: string /* YYYY-MM-DD */; merchant: string; amount: number|bigint; category?: Category }`
   - `Report`, `ReportInsights`(AI 문장 + 코드가 채운 거래 정보), `ReportTotals`(코드 계산값)는 ARCHITECTURE.md "데이터 모델"의 `reports` 컬럼과 맞춘다. AI 응답 타입에는 금액 필드를 두지 않는다.
2. `src/lib/categories.ts`: 고정 카테고리 10개(식비 / 카페·간식 / 교통 / 쇼핑 / 구독·정기결제 / 주거·통신 / 의료·건강 / 문화·여가 / 교육 / 기타)를 `as const` 배열로 export하고 `Category` 타입을 파생한다. 단일 출처다.
3. `src/lib/plan.ts`:
   - `getMonthlyLimit(plan: Plan): number` — free 3, pro 30
   - `getReportModel(plan: Plan): string` — free는 `process.env.CLAUDE_MODEL_REPORT_FREE`, pro는 `CLAUDE_MODEL_REPORT_PRO`. 값이 없으면 명확한 오류를 던진다.
   - `getFastModel(): string` — `CLAUDE_MODEL_FAST`
   - `getKstMonthStart(now: Date): string` — now가 속한 KST 월의 1일을 `YYYY-MM-01`로 반환한다. 테스트: `2026-04-30T14:59:59Z`(KST 4/30 23:59:59)는 `2026-04-01`, `2026-04-30T15:00:00Z`(KST 5/1 00:00)는 `2026-05-01`, 연말·연초 경계 포함.
   - 플랜 → 한도·모델 선택은 이 파일 한 곳에서만 한다(ADR-005).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조(`types/`, `lib/`)를 따르는가?
   - 카테고리 정의가 `categories.ts` 한 곳뿐인가?
   - CLAUDE.md CRITICAL 규칙(금액 정수, AI 스키마에 금액 없음)을 위반하지 않았는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 모델 ID를 코드에 하드코딩하지 마라. 이유: 환경 변수로 주입한다(ADR-005).
- 날짜 계산에 로컬 타임존(`new Date().getMonth()` 등)을 쓰지 마라. 이유: 서버 타임존에 따라 월 경계가 어긋난다. 항상 KST(UTC+9) 기준으로 계산한다.
- 기존 테스트를 깨뜨리지 마라.
