# Step 0: ui-primitives

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: UI 작업 전 디자인 시스템 읽기)
- `/docs/ARCHITECTURE.md` ("패턴" 프레젠테이션/컴포넌트 테스트, "화면과 컴포넌트")
- `/docs/ADR.md` (ADR-014, 015)
- `/docs/UI_GUIDE.md` (전체)
- `/docs/design-system/README.md`
- `/docs/design-system/tokens.css`
- `/docs/design-system/components/Button/README.md`, `/docs/design-system/components/Button/preview.html`
- `/docs/design-system/components/Badge/README.md`, `/docs/design-system/components/Badge/preview.html`
- `/docs/design-system/components/Notice/README.md`, `/docs/design-system/components/Notice/preview.html`
- `/docs/design-system/components/bundle.css` (모양 참고용, 앱에 그대로 가져오지 않는다)
- 이전에 만든 `src/components/Button.tsx`, `src/components/Button.test.tsx`, `src/app/globals.css`

## 작업

`Foo.test.tsx`를 먼저 쓰고 `Foo.tsx`를 만든다. 컴포넌트는 props만 받는 동기 함수이며 `renderToStaticMarkup`으로 테스트한다(문구, aria 속성, 상태).

1. `Button` 보완: 명세의 variant(주요/보조/위험 등), 크기(큰 버튼 포함), 비활성 상태, 링크 형태(`href`)를 지원하게 한다. 초록 주요 버튼은 한 화면에 하나라는 규칙은 사용처에서 지킨다. 고정 너비를 두지 않는다.
2. `Badge`: 플랜 배지("무료"/"프로"), 잠금 배지 등 명세의 variant. 아이콘은 `lucide-react`(strokeWidth 1.5).
3. `Notice`: 오류(`role="alert"`)·결제 확인 중·결제 완료 안내(`role="status"`) variant. 오류 문구 형식(굵은 사실 → 할 일 → "횟수는 차감되지 않았어요")을 children 구조로 받을 수 있게 한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 각 컴포넌트가 명세 README와 preview.html의 모양·상태를 따르는가?
   - 색·글자 크기가 `@theme` 토큰(`bg-primary`, `text-title-md` 등)만 쓰는가?
   - 영어 UI 문구와 이모지 아이콘이 없는가?
3. 결과에 따라 `phases/2-app/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `bundle.css`나 `fs-` 클래스를 앱에 가져오지 마라. 이유: 스타일 방식은 Tailwind 하나다(UI_GUIDE).
- 컴포넌트를 async로 만들거나 Supabase를 직접 읽지 마라. 이유: 정적 렌더링 테스트가 불가능해진다.
- `shadow-soft` 외의 그림자, 그라데이션, blur를 쓰지 마라. 이유: UI_GUIDE의 안티패턴.
- 기존 테스트를 깨뜨리지 마라.
