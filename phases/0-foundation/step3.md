# Step 3: statement-lib

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` ("업로드와 분석 규칙", "한계")
- `/docs/ARCHITECTURE.md` ("분석" 데이터 흐름 1~4단계)
- `/docs/ADR.md` (ADR-007, 010, 011)
- 이전 step에서 만든 `src/types/`, `src/lib/categories.ts`, `src/lib/plan.ts`, `vitest.config.ts`

## 작업

`src/lib/statement/` 아래에 순수 함수를 만든다. 테스트(`*.test.ts`)를 먼저 작성하고 구현한다. 외부 API 호출은 이 모듈에 넣지 않는다.

1. `decode.ts` — `decodeCsv(buffer: ArrayBuffer): string`: UTF-8(`fatal: true`)로 먼저 디코딩하고 실패하면 EUC-KR(`TextDecoder("euc-kr")`)로 디코딩한다. 테스트: UTF-8 한글, EUC-KR 한글 바이트열 각각.
2. `parse.ts` — `parseStatement(buffer: ArrayBuffer, fileName: string): string[][]`: xls/xlsx/csv 모두 SheetJS로 읽어 첫 시트를 문자열 2차원 배열로 반환한다. CSV는 위 `decodeCsv` 결과를 SheetJS로 파싱한다. 지원하지 않는 확장자와 암호 걸린 파일은 `StatementError("unsupported_file")`을 던진다(오류 코드는 ARCHITECTURE.md의 목록과 동일).
3. `mask.ts` — `maskTopRows(rows: string[][], n = 10): string[][]`: 상단 n행만 남기고 6자리 이상 연속 숫자를 마스킹(예: `*`로 치환)한다. 가맹점명 속 짧은 숫자(예: `GS25`)는 남긴다.
4. `normalize.ts` — `normalizeRows(rows, mapping: { headerRowIndex, dateCol, merchantCol, amountCol }): { transactions: Transaction[]; excludedCount: number }`
   - 헤더 행 아래만 처리하고, 날짜·가맹점·금액 열 외에는 읽지 않는다(카드번호 등은 버림).
   - 날짜는 `YYYY-MM-DD`로 정규화(`2026.10.03`, `2026-10-03`, `20261003`, 엑셀 시리얼 등). 금액은 쉼표·원 표기를 제거한 원 단위 정수, 취소·환불은 음수 그대로.
   - 날짜나 금액을 읽을 수 없는 행은 거래에서 빼고 `excludedCount`에 센다. 가맹점이 비어 있는 행도 제외로 센다.
   - 3,000건 초과는 `StatementError("too_many_rows")`, 거래 0건은 `StatementError("no_transactions")`.
   - 임시 거래 id는 파일의 행 순번이며 DB id와 연결하지 않는다(`Transaction`에 요청 내 임시 `id` 필드가 필요하면 types에 추가).
5. `dedupe.ts` — `dedupeKey(t)`와 `pickNewTransactions(fileTxns, existingKeys: Set<string>)`: 키는 (날짜, 가맹점, 금액). 기존 키에 있는 거래는 제외하고, **같은 파일 안에서 키가 겹치는 거래는 모두 유지**한다. 테스트로 두 규칙을 각각 증명한다.
6. `index.ts`에서 공개 함수를 re-export한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 모든 함수가 순수 함수이고 네트워크·DB를 쓰지 않는가?
   - 금액이 정수로만 처리되는가(`parseFloat`·소수 연산 없음)?
   - 사용 열 외의 데이터가 반환값에 남지 않는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 금액에 `parseFloat`나 부동소수점 연산을 쓰지 마라. 이유: 금액 정확성은 타협하지 않는 원칙이다.
- 원본 파일이나 사용하지 않는 열을 반환값·로그에 남기지 마라. 이유: ADR-007(원본 미저장, 최소 저장).
- 같은 파일 안의 중복 거래를 제거하지 마라. 이유: ADR-011, 진짜 동일 결제가 한 파일에 둘 있을 수 있다.
- 기존 테스트를 깨뜨리지 마라.
