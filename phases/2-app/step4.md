# Step 4: ui-trends-settings

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL 규칙 전부)
- `/docs/PRD.md` ("핵심 기능" 4·5·6번, "화면" trends·settings, "요금제")
- `/docs/ARCHITECTURE.md` ("화면과 컴포넌트", "결제", "데이터 삭제")
- `/docs/ADR.md` (ADR-004, 013, 015)
- `/docs/UI_GUIDE.md` (전체, 특히 잠금 화면·월별 총지출 결정, "색")
- `/docs/design-system/README.md`, `/docs/design-system/tokens.css`
- `/docs/design-system/components/{MonthlyChart,ChangeTable,LockedPanel,SettingsRow}/README.md` 와 각 `preview.html`
- 이전 step의 `src/lib/aggregate/`, `src/lib/format.ts`, `src/components/CategoryBars.tsx`, `src/components/{Button,Badge,Notice}.tsx`

## 작업

테스트를 먼저 쓴다(`renderToStaticMarkup`).

1. `MonthlyChart`: props `{ rows: { month; total }[] }`. **`CategoryBars`와 같은 가로 막대**, `primary` 한 색, 최근 달이 위, 최대 12개월, 모든 막대에 금액 표시. 세로 막대·축·지난달 색 구분 금지.
2. `ChangeTable`: props `{ rows: { category; last; current; diff }[] }`. 표 형식(카테고리 / 지난달 / 이번 달 / 증감), 금액 오른쪽 정렬, 증감은 `▲ +44,300원` / `▼ −70,500원` / 변화 없음 `muted`이며 글자색 + 기호·부호를 항상 함께 쓴다. 모바일에서 가로 스크롤 허용.
3. `LockedPanel`: 차트 자리에 카드 하나 — `Lock` 아이콘(lucide, 이모지 아님), 잠금 배지, 제목, 한 문장 설명, 주요 버튼("프로 구독하기" → `/api/checkout`), 바로 아래 "테스트 결제 환경이며 실제로 청구되지 않습니다". **흐린 가짜 차트를 깔지 않는다.**
4. `SettingsRow`: 설정 한 줄(제목, 설명, 오른쪽 액션). 위험 variant("내 데이터 전체 삭제"만 `danger`).
5. `src/app/dashboard/trends/page.tsx`(Server Component): `profiles.plan`이 pro이면 `transactions`(RLS)를 읽어 `lib/aggregate`의 `monthlyTotals`/`categoryChanges`로 계산한 값을 `MonthlyChart` + `ChangeTable`에 넘긴다. free이면 `LockedPanel`만 렌더링하고 **거래 데이터 조회 자체를 하지 않는다**. 거래가 없으면 빈 상태 문구.
6. `src/app/dashboard/settings/page.tsx`: `SettingsRow` 목록 — 플랜(무료/프로 배지), 구독 관리(`/api/portal` 링크, 프로일 때만), 내 데이터 전체 삭제(확인 대화상자를 가진 작은 Client Component `DeleteDataButton`; 실제 `DELETE /api/data` 호출 연결은 다음 phase 마지막 step에서 하므로 이 step에서는 호출 함수 `deleteMyData()`를 `src/lib/client/delete-data.ts`로 두고 `fetch("/api/data", { method: "DELETE" })`만 구현), 로그아웃.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 프로 여부를 `profiles.plan`으로만 판단하는가? 무료 사용자에게 거래 데이터가 전달되지 않는가?
   - 잠금 화면에 가짜 차트가 없고 테스트 결제 문구가 있는가?
   - `danger` 색이 데이터 삭제 버튼·오류 아이콘에만 쓰였는가?
3. 결과에 따라 `phases/2-app/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 무료 사용자에게 흐린 미리보기/가짜 데이터를 보여주지 마라. 이유: ADR-015에서 금지했다.
- 증감률·합계를 컴포넌트 안에서 계산하지 마라. 이유: `lib/aggregate`가 단일 출처다.
- 세로 막대, 원형 차트, 축, 범례를 만들지 마라. 이유: ADR-013.
- 기존 테스트를 깨뜨리지 마라.
