# Step 6: data-delete

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: RLS, `usage`/`profiles` 보존)
- `/docs/PRD.md` ("핵심 기능" 6번, "화면" 설정)
- `/docs/ARCHITECTURE.md` ("데이터 삭제")
- `/docs/ADR.md` (ADR-009)
- `/docs/UI_GUIDE.md` ("한국어 우선" 오류 형식)
- 이전 step의 `supabase/migrations/*.sql`(DELETE 정책), `src/lib/supabase/server.ts`, `src/lib/client/delete-data.ts`, `src/app/dashboard/settings/page.tsx`, `DeleteDataButton` 컴포넌트

## 작업

테스트를 먼저 쓴다. Supabase는 모킹한다.

1. `src/app/api/data/route.ts` (DELETE): 세션이 없으면 401. **사용자 세션 클라이언트(RLS)**로 본인의 `transactions`와 `reports`를 삭제한다. `profiles`와 `usage`는 건드리지 않는다. 성공 시 `200 { ok: true }`, 실패 시 한국어 `message`가 있는 오류 JSON. service role을 쓰지 않는다.
2. 설정 화면의 `DeleteDataButton`을 `deleteMyData()`에 연결한다: 확인 대화상자("거래와 리포트가 모두 지워져요. 되돌릴 수 없어요" 등 해요체) → 호출 → 성공하면 `router.refresh()`와 성공 안내(`Notice`), 실패하면 오류 `Notice`. 이 버튼만 `danger` 색을 쓴다.
3. 테스트: 로그인 없이 호출 시 401과 삭제 0회, 정상 삭제 시 `transactions`·`reports` 두 테이블만 대상이고 `usage`/`profiles`는 호출되지 않는지, 컴포넌트 문구·aria.

마지막으로 전체 점검: `phases/` 세 phase의 모든 step이 완료되면 `npm run lint && npm run build && npm test`가 통과하고 `.env.example` 변수가 ARCHITECTURE.md 표와 일치하는지 확인하고, 사용자가 수동으로 해야 할 일(Supabase 마이그레이션 적용·Google OAuth 설정, Polar sandbox 상품 생성·웹훅 URL 등록, `.env` 채우기)을 `README.md` 같은 새 문서가 아니라 이 step의 `summary`에 한 줄로 남긴다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 삭제 후에도 `usage`(이번 달 사용 횟수)와 `profiles`가 남는가?
   - 삭제가 RLS를 거치는 사용자 세션으로 수행되는가?
   - 삭제 확인 문구가 한국어 해요체인가?
3. 결과에 따라 `phases/2-app/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 + 사용자 수동 작업 목록"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `usage`를 지우거나 0으로 되돌리지 마라. 이유: 데이터 삭제로 월 한도를 우회할 수 있게 된다(ADR-009).
- 계정(`profiles`)·구독을 삭제하지 마라. 이유: PRD에서 계정과 구독은 유지하기로 했다.
- 리포트·업로드 단위 개별 삭제 API를 만들지 마라. 이유: MVP 제외 사항.
- 기존 테스트를 깨뜨리지 마라.
