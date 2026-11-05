# Step 2: ui-dashboard-home

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL 규칙 전부)
- `/docs/PRD.md` ("화면" `/dashboard`, "분석 중 화면", "실패 처리", "사용자 흐름", "시나리오")
- `/docs/ARCHITECTURE.md` ("화면과 컴포넌트", "상태 관리", "분석" 응답 형식·오류 코드)
- `/docs/ADR.md` (ADR-004, 008, 014, 015)
- `/docs/UI_GUIDE.md` (전체)
- `/docs/design-system/README.md`, `/docs/design-system/tokens.css`
- `/docs/design-system/components/{AppHeader,UploadDropzone,AnalyzingState,UsageMeter,ReportListItem}/README.md` 와 각 `preview.html`
- 이전 step의 `src/components/*`, `src/app/dashboard/layout.tsx`, `src/app/api/analyze/route.ts`, `src/lib/plan.ts`, `src/lib/supabase/server.ts`

## 작업

테스트를 먼저 쓴다(`renderToStaticMarkup`: 문구, aria, 0회·비활성 상태).

1. `AppHeader`: 홈 / 월별 추이 / 설정 + 플랜 배지("무료"/"프로"). props `{ plan; currentPath }`, 현재 경로는 `aria-current`. `dashboard/layout.tsx`에 연결하고 `profiles.plan`을 서버에서 읽어 넘긴다.
2. `UsageMeter`: props `{ used; limit }` → 이번 달 남은 횟수. 0회 상태 문구와 업그레이드 안내 링크(`/#pricing` 또는 `/api/checkout`)를 포함한다.
3. `AnalyzingState`: 스피너 + "분석 중이에요. 1~2분 걸릴 수 있어요"만 표시(진행 단계 없음). 스피너는 `prefers-reduced-motion`이면 느리게.
4. `UploadDropzone`(Client Component): 파일 선택/드래그, 클라이언트 사전 확인(확장자 csv/xls/xlsx, 5MB), 남은 횟수 0이면 비활성 + 업그레이드 안내. 제출하면 `POST /api/analyze`(multipart)를 호출하고 그동안 그 자리에 `AnalyzingState`를 보여준다. 성공하면 `router.push("/dashboard/reports/" + reportId)`, 실패하면 응답의 `message`를 `Notice`(오류)로 표시한다. 상태는 `useState`만 쓴다. 외부 API(Claude 등)를 직접 호출하지 않는다.
5. `ReportListItem`: props `{ id; fileName; periodStart; periodEnd; totalAmount; createdAt }` → 리포트 상세 링크. 금액·날짜 표기는 UI_GUIDE "숫자 표시"를 따르는 포맷 함수(`src/lib/format.ts`, 테스트 먼저)를 쓴다: `12,500원`, `2026.10.03`, `10.01–10.31`, `tabular-nums`.
6. `src/app/dashboard/page.tsx`(Server Component): `UploadDropzone` → `UsageMeter` → `ReportListItem` 목록(최근순). Supabase(사용자 세션 + RLS)로 읽는다. `?checkout=success`이면 `Notice`로 "결제 확인 중" 안내만 표시한다(플랜 판단에는 쓰지 않음). 리포트가 없으면 빈 상태 문구.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 업로드 오류 문구가 "사실(굵게) → 할 일 → 횟수는 차감되지 않았어요" 형식인가?
   - `checkout=success` 파라미터가 플랜 표시에 쓰이지 않는가?
   - 클라이언트 컴포넌트가 외부 API·비밀값을 쓰지 않는가?
3. 결과에 따라 `phases/2-app/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 분석 진행 단계 표시, 폴링, 전역 상태 라이브러리를 추가하지 마라. 이유: ADR-008, 단일 요청 방식이다.
- 금액을 문자열 이어붙이기로 직접 포맷하지 마라. 이유: `format.ts` 한 곳에서 `Intl.NumberFormat('ko-KR')`로 일관되게 처리한다.
- 업로드한 파일을 브라우저 저장소(localStorage 등)에 저장하지 마라. 이유: 원본 미저장 원칙.
- 기존 테스트를 깨뜨리지 마라.
