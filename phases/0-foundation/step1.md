# Step 1: design-tokens

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` (ADR-015)
- `/docs/UI_GUIDE.md` (특히 "앱에 옮기는 방법 (Tailwind)", "한국어 우선", "타이포그래피")
- `/docs/design-system/README.md`
- `/docs/design-system/tokens.css`
- `/docs/design-system/tokens.json`
- 이전 step에서 만든 `package.json`, `src/app/layout.tsx`, `src/app/globals.css`

이전 step에서 만들어진 코드를 꼼꼼히 읽고 작업하라.

## 작업

1. `src/app/globals.css`를 Tailwind `@theme` 기반으로 다시 쓴다. `tokens.css`의 색·글자 스타일·모서리·그림자·글꼴 값을 UI_GUIDE.md "앱에 옮기는 방법" 변환표대로 같은 이름으로 옮긴다.
   - 모서리는 Tailwind 기본값을 덮어쓴다(`--radius-xs` … `--radius-xl`, `--radius-pill`).
   - 글자 스타일은 `--text-<이름>`과 `--text-<이름>--line-height`, `--font-weight`, `--letter-spacing`을 함께 정의한다.
   - 간격은 Tailwind 기본 4px 단위를 그대로 쓰므로 정의하지 않는다.
2. `src/app/layout.tsx`: `<html lang="ko">`, `pretendard` 패키지의 dynamic subset CSS를 import(CDN 금지), 본문에 `font-sans`, `break-keep`, 기본 글자색·배경색 토큰을 적용한다. 메타데이터 title은 "FinSight".
3. `src/app/page.tsx`는 기본 템플릿 내용을 비우고 임시 최소 페이지로 둔다(이후 step에서 교체).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
grep -c "@theme" src/app/globals.css
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `tokens.css`의 모든 색·글자·모서리·그림자 토큰이 `@theme`에 빠짐없이 있는가?
   - hex 값은 `globals.css`에만 있고 `.tsx`에는 없는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-foundation/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 다크 모드 변수, 그라데이션, 글로우 등 UI_GUIDE의 안티패턴을 넣지 마라. 이유: 라이트 모드 전용이고 평평한 카드 + 1px 외곽선이 원칙이다.
- 토큰에 없는 색·글자 크기를 만들지 마라. 이유: 토큰이 단일 출처다(값을 바꿀 때는 `tokens.json`·`tokens.css`를 먼저 고친다).
- CDN으로 글꼴을 불러오지 마라. 이유: UI_GUIDE에서 패키지 import로 정했다.
- 기존 테스트를 깨뜨리지 마라.
