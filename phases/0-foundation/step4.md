# Step 4: aggregate-lib

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` ("핵심 기능" 3, 4번, "업로드와 분석 규칙")
- `/docs/ARCHITECTURE.md` ("분석" 6단계, 데이터 모델)
- `/docs/ADR.md` (ADR-006, 013)
- `/docs/UI_GUIDE.md` ("숫자 표시", "차트")
- 이전 step에서 만든 `src/types/`, `src/lib/categories.ts`, `src/lib/statement/` (Transaction 형태 확인)

## 작업

`src/lib/aggregate/` 아래에 순수 함수를 만든다. 테스트를 먼저 작성하고 구현한다. 화면에 표시되는 합계·건수·증감률은 모두 여기서 계산한다.

1. `category.ts` — `sumByCategory(txns): { category: Category; total: number; ratio: number }[]`: 카테고리별 합계, 금액 내림차순. 0원 카테고리는 결과에서 뺀다. `ratio`는 양수 합계 대비 비율(정수 %로 반올림, 합이 0이면 0). 환불이 더 커서 합계가 음수인 카테고리도 항목으로 유지한다(막대 없이 금액만 표시하기 위함).
2. `summary.ts` — `summarize(txns): { totalAmount; transactionCount; periodStart; periodEnd }`: 총지출은 환불(음수) 상계 후 합계. 기간은 최소·최대 날짜.
3. `monthly.ts` — `monthlyTotals(txns): { month: "YYYY-MM"; total: number }[]`: 최근 달이 앞, 최대 12개월. `categoryChanges(txns, thisMonth, lastMonth): { category; last; current; diff }[]`: 카테고리별 전월 대비 증감(`diff = current - last`). 한쪽 달에만 있는 카테고리도 포함한다.
4. `index.ts`에서 re-export.

테스트에 반드시 넣을 것: 환불 상계, 환불이 큰 카테고리의 음수 합계, 빈 입력, 월 경계(KST 날짜 문자열을 그대로 쓰므로 타임존 변환 없음), 12개월 초과 시 최신 12개월만.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 순수 함수이며 AI·DB 호출이 없는가?
   - 금액 연산이 정수만 쓰는가?
   - CLAUDE.md CRITICAL 규칙(표시 숫자는 코드가 계산)을 위반하지 않았는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 날짜를 `new Date()`로 변환해 월을 뽑지 마라. 이유: 타임존에 따라 월이 어긋난다. `YYYY-MM-DD` 문자열에서 앞 7자를 잘라 쓴다.
- 퍼센트·증감률을 부동소수점 문자열 그대로 반환하지 마라. 이유: 화면 표기 일관성을 위해 정수 %로 반올림한다.
- 기존 테스트를 깨뜨리지 마라.
