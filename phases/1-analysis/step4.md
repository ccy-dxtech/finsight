# Step 4: analyze-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL 규칙 전부)
- `/docs/PRD.md` ("업로드와 분석 규칙", "사용자 흐름: 업로드와 분석", "시나리오", "한계")
- `/docs/ARCHITECTURE.md` ("분석 (`POST /api/analyze`)" 전체, 오류 코드, 런타임)
- `/docs/ADR.md` (ADR-006~011)
- 이전 step에서 만든 파일 전부: `src/lib/statement/*`, `src/lib/aggregate/*`, `src/lib/plan.ts`, `src/lib/categories.ts`, `src/services/claude.ts`, `src/lib/supabase/server.ts`, `supabase/migrations/*.sql`(RPC 인자 형태), `src/types/`

## 작업

테스트를 먼저 작성한다. Claude 서비스와 Supabase는 모킹한다.

`src/app/api/analyze/route.ts` — `POST`(multipart, 파일 1개), `export const runtime = "nodejs"`, `maxDuration`은 크게(예: 300) 잡는다. 라우트는 아래 순서로 **기존 순수 함수·서비스를 조합만** 한다. 복잡하면 `src/lib/analyze/pipeline.ts`로 의존성 주입형 함수를 분리해 테스트한다.

1. 세션 확인(없으면 401), 확장자(csv/xls/xlsx)와 5MB 확인 → `unsupported_file` / `file_too_large`.
2. 한도 확인(**이 한 곳에서만**): `profiles.plan`과 이번 달(`getKstMonthStart`) `usage.count` 조회, `count >= getMonthlyLimit(plan)`이면 `quota_exceeded`로 중단. 같은 plan으로 리포트 모델을 정한다.
3. 파일 읽기: `parseStatement` → `maskTopRows` → `mapColumns`(null이면 `columns_not_found`) → `normalizeRows`(`too_many_rows`/`no_transactions`).
4. 중복 확인: 파일 기간의 기존 거래를 조회해 키 Set을 만들고 `pickNewTransactions`. 새 거래 0건이면 `already_analyzed`로 중단.
5. 분류: 고유 가맹점명을 200개씩 나눠 `classifyMerchants` 병렬 호출. 응답에 없는 가맹점은 `기타`.
6. 리포트: 카테고리 합계·기간은 `lib/aggregate`로 계산. **리포트 대상은 그 파일의 거래 전체**(새 거래만이 아님). `writeReport` 후, AI가 참조한 id를 코드가 날짜·가맹점·금액으로 치환해 `insights`에 넣고 **존재하지 않는 id를 참조한 항목은 버린다**.
7. 저장: `commit_analysis` RPC(리포트 + **새 거래만** + 사용 횟수 +1) → `200 { reportId }`.

오류 응답은 `4xx/5xx { error: "<code>", message: "<한국어 안내>" }`. 메시지는 UI_GUIDE의 오류 형식(굵게 표시할 사실 → 할 일 → "횟수는 차감되지 않았어요")을 따른다. 코드 목록: `unsupported_file`, `file_too_large`, `too_many_rows`, `columns_not_found`, `no_transactions`, `already_analyzed`, `quota_exceeded`, `ai_failed`. 예기치 못한 예외도 `ai_failed` 또는 일반 5xx로 처리하되 로그에 거래 내용을 남기지 않는다.

테스트에 반드시 넣을 것: 정상 흐름, 각 오류 코드별 DB 쓰기 0회, 한도 초과 시 AI 호출 0회, `already_analyzed` 시 차감 없음, 리포트는 전체 거래·저장은 새 거래만, 없는 id 참조 항목 제거, 원본 파일이 어디에도 저장되지 않음.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 7단계 전에 실패하면 DB 쓰기가 전혀 없는가?
   - 한도 확인이 라우트 한 곳뿐인가? 플랜은 `profiles.plan`에서만 읽는가?
   - 화면에 갈 금액·건수가 모두 코드 계산인가?
   - 업로드 원본 파일과 날짜·가맹점·금액 외 열이 저장·로그에 남지 않는가?
3. 결과에 따라 `phases/1-analysis/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 클라이언트가 보낸 plan 값이나 헤더를 신뢰하지 마라. 이유: Pro 여부는 `profiles.plan`으로만 판단한다.
- 진행 단계 스트리밍, 작업 큐, 상태 테이블을 만들지 마라. 이유: ADR-008, 끝나면 JSON 한 번 응답한다.
- 중간 단계에서 DB에 임시 저장하지 마라. 이유: 실패 시 깨끗한 재시도와 차감 없음을 보장하기 위해서다.
- 기존 테스트를 깨뜨리지 마라.
