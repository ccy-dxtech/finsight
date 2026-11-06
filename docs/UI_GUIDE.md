# UI 디자인 가이드

색·글꼴·간격·모서리·컴포넌트의 원본은 `docs/design-system/`(FinSight 디자인 시스템)이다. 이 문서는 원칙, 금지 사항, 디자인 시스템과 다르게 정한 것, 앱(Tailwind)에 옮기는 방법을 적는다. 둘이 다르면 이 문서가 우선한다(ADR-015).

| 무엇 | 어디 |
|---|---|
| 디자인 원칙·문구·색 역할·화면별 구성 | `docs/design-system/README.md` |
| 토큰(색, 글자, 간격, 모서리, 그림자)과 쓰임 | `docs/design-system/tokens.json` (CSS 변수: `tokens.css`) |
| 컴포넌트 명세 | `docs/design-system/components/<이름>/README.md` |
| 컴포넌트 모양 예시 | `docs/design-system/components/<이름>/preview.html` (브라우저로 열기, 스타일은 `components/bundle.css`) |
| 사용자 여정, 단계별 다음 행동, 상태별 화면, 용어 | `docs/UX_GUIDE.md` |

## 디자인 원칙
1. **숫자가 주인공이다.** 화면에서 가장 먼저 읽혀야 하는 것은 금액이다. 장식은 숫자를 가리지 않는다.
2. **차분한 금융 도구다.** 랜딩도 대시보드와 같은 톤을 쓴다. 과장된 마케팅 연출은 하지 않는다.
3. **색은 의미가 있을 때만 쓴다.** 포인트 색은 초록(`primary`) 하나이고, 초록 버튼은 한 화면에 하나다. 증감의 빨강·파랑은 글자색으로만 쓴다. 나머지는 무채색이다.
4. **한국어가 먼저다.** 문구, 글꼴, 줄바꿈, 숫자·날짜 표기를 모두 한국어 사용자 기준으로 정한다. 영어 템플릿을 번역한 느낌이 나면 안 된다.

## 디자인 시스템과 다르게 정한 것
`docs/design-system/` 사본은 아래 결정에 맞게 이미 고쳐 두었다.

| 항목 | 디자인 시스템 원래 안 | FinSight 결정 |
|---|---|---|
| 랜딩 히어로 | 가운데 정렬 | 좌측 정렬. 가운데 정렬 히어로는 쓰지 않는다 |
| 잠금 화면(무료의 월별 추이) | 흐린 미리보기 차트 위에 안내 | 차트 자리에 카드 하나(잠금 배지, 제목, 한 문장 설명, 주요 버튼, 테스트 결제 문구). 흐린 가짜 차트를 깔지 않는다 |
| 월별 총지출 | 세로 막대 + 축, 지난달은 `primary-muted` | `CategoryBars`와 같은 가로 막대, `primary` 한 색(ADR-013) |
| 아이콘 | 정하지 않음, 🔒 이모지 예외 | `lucide-react`. 잠금 표시도 `Lock` 아이콘 |

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| 이모지 아이콘, 반짝이(✨) 장식 | AI 기능 강조용 클리셰 |
| 영어 UI 문구(Get started, Upgrade, Pro 배지 등) | 한국 사용자용 서비스가 번역 템플릿처럼 보인다 |
| `shadow-soft` 외의 그림자 | 디자인 시스템은 평평한 카드 + 1px 외곽선이다 |

## 한국어 우선
- **문구**: 모든 화면 문구는 한국어 해요체로 쓴다("분석 중이에요", "파일을 올려 주세요"). 영어는 고유명사(FinSight, Google, Claude, Polar)만 쓴다.
- **플랜 이름**: 화면에서는 "무료", "프로"라고 쓴다. 코드와 DB 값은 `free`, `pro`다.
- **버튼**: 누르면 무엇이 되는지 해요체가 아닌 짧은 말로 쓴다. 예: "시작하기", "파일 올리기", "프로 구독하기", "구독 관리", "Google 계정으로 로그인".
- **오류**: 무슨 일이 있었는지(굵게) → 사용자가 할 일 → "횟수는 차감되지 않았어요" 순서로 쓴다. 예: "**날짜·가맹점·금액 열을 찾지 못했어요.** 카드사에서 받은 원본 파일인지 확인해 주세요. 횟수는 차감되지 않았어요."
- **AI 문장**: 판단이 아니라 관찰로 쓴다("배달 주문이 평소보다 많아요"). 나무라거나 겁주는 말, 느낌표, 이모지는 쓰지 않는다.
- **테스트 결제**: 요금제·결제 버튼 바로 아래에 항상 "테스트 결제 환경이며 실제로 청구되지 않습니다"를 둔다.
- **줄바꿈**: `<html lang="ko">`로 두고, 제목과 본문에 `break-keep`(word-break: keep-all)을 적용해 단어 중간에서 줄이 바뀌지 않게 한다.
- **길이**: 버튼·배지·탭에 고정 너비를 두지 않는다. 한글 문구 길이가 달라도 깨지지 않게 한다.

## 앱에 옮기는 방법 (Tailwind)
- `docs/design-system/tokens.css`의 값을 `src/app/globals.css`의 Tailwind `@theme`에 같은 이름으로 옮긴다. 값을 바꿀 때는 `tokens.json`·`tokens.css`를 먼저 고친다.
- 컴포넌트는 `src/components/`에 디자인 시스템과 같은 이름(`Button`, `UploadDropzone`, `CategoryBars` …)으로 만들고, Tailwind 유틸리티로 `components/bundle.css`와 같은 모양을 낸다. `fs-` 클래스와 `bundle.css`를 앱에 그대로 가져오지 않는다(스타일 방식은 Tailwind 하나).

| 토큰 | `@theme` 변수 | 쓰는 법 |
|---|---|---|
| 색 `primary`, `ink`, `hairline` … | `--color-primary`, `--color-ink` … | `bg-primary`, `text-ink`, `border-hairline` |
| 모서리 `radius-xs`~`radius-xl`, `radius-pill` | `--radius-xs` … `--radius-xl`, `--radius-pill` | `rounded-xl`(24px), `rounded-pill`. Tailwind 기본값을 덮어쓴다 |
| 그림자 `shadow-soft` | `--shadow-soft` | `shadow-soft` |
| 글자 `title-md`, `number-xl` … | `--text-title-md`와 `--text-title-md--line-height`, `--font-weight`, `--letter-spacing` | `text-title-md` |
| 글꼴 | `--font-sans` | `font-sans` |
| 간격 `space-*` | Tailwind 기본 4px 단위 그대로 | `xxs`=1, `xs`=2, `sm`=3, `base`=4, `md`=5, `lg`=6, `xl`=8, `xxl`=12, `section`=24 (예: `p-6`, `gap-3`) |

- **토큰만 쓴다**: 색은 `bg-primary`처럼 토큰 이름으로만 쓰고 `#0e7f55`, `bg-[#...]`, `rgb()`를 컴포넌트에 직접 쓰지 않는다. 글자는 `text-title-md`처럼 글자 스타일 토큰만 쓰고 `text-[17px]`을 쓰지 않는다. 막대 행의 열 너비(`grid-cols-[96px_1fr_108px_44px]`)처럼 토큰이 없는 레이아웃 값만 임의 값을 허용한다.
- **만드는 순서**: `globals.css` 토큰 → 공용 컴포넌트(`Button`, `Badge`, `Notice`) → 화면 컴포넌트 → 페이지. 화면별 배치는 `docs/ARCHITECTURE.md`의 "화면과 컴포넌트"를 따른다.

## harness step 설계 규칙 (UI)
UI를 다루는 step 파일(`phases/*/step{N}.md`)을 만들 때 아래를 넣는다. 그래야 각 step 세션이 디자인 시스템을 읽고 맞춘다.
- **읽어야 할 파일**: `/docs/UI_GUIDE.md`, `/docs/design-system/README.md`, `/docs/design-system/tokens.css`, 그 step에서 만들 컴포넌트마다 `/docs/design-system/components/<이름>/README.md`와 `preview.html`. 토큰 step은 `/docs/design-system/tokens.json`도 넣는다.
- **작업**: 만들 컴포넌트 이름(디자인 시스템과 같은 이름), props 시그니처, 이 문서의 "디자인 시스템과 다르게 정한 것" 중 해당 항목.
- **AC**: 아래 명령을 넣는다. 마지막 줄은 컴포넌트에 색 hex를 직접 쓰지 않았는지 확인한다.
  ```bash
  npm run lint && npm run build && npm test
  ! grep -rnE "#[0-9a-fA-F]{6}\b" src --include=*.tsx
  ```

## 색
- 역할과 대비 값은 `tokens.json`의 `usage`를 따른다. 라이트 모드만 있다.
- 증감은 지출 증가 `change-up`(빨강, ▲ +), 감소 `change-down`(파랑, ▼ −), 변화 없음 `muted`. 글자색으로만 쓰고 기호와 부호를 항상 같이 쓴다.
- `danger`는 "내 데이터 전체 삭제" 버튼과 오류 아이콘에만 쓴다.

## 숫자 표시
- 금액은 `Intl.NumberFormat('ko-KR')`로 `12,500원`처럼 표시한다. 음수는 `-12,500원`이다.
- 금액이 나오는 모든 곳에 `tabular-nums`를 쓴다. 표의 금액은 오른쪽 정렬한다. 단위(원·건·회)는 숫자보다 작게 붙인다.
- 날짜는 `2026.10.03`, 월은 `2026년 10월`, 리포트 기간은 `10.01–10.31` 형식이다.
- 증감은 `▲ +44,300원` / `▼ −70,500원` 형식이다.

## 차트
외부 라이브러리 없이 HTML/CSS 가로 막대 컴포넌트 하나로 그린다(ADR-013).

| 화면 | 데이터 | 컴포넌트 |
|---|---|---|
| 리포트 상세 | 카테고리별 지출(한 업로드) | `CategoryBars`: 금액 내림차순, 0원 카테고리는 숨김, 비율 표시 |
| 월별 추이 | 월별 총지출 | `MonthlyChart`: 같은 가로 막대, 최근 달이 위, 최대 12개월 |
| 월별 추이 | 카테고리별 전월 대비 | `ChangeTable`: 차트가 아닌 표(카테고리 / 지난달 / 이번 달 / 증감) |
| 리포트 상세 | 총지출, 거래 건수, 기간, 제외 | `StatSummary` 숫자 타일 |
| 대시보드 홈 | 이번 달 남은 횟수 | `UsageMeter` |

- **막대 하나 = 한 행**: 왼쪽에 라벨(카테고리나 월), 가운데 막대, 오른쪽에 금액. 막대는 12px 높이의 필 모양, `primary` 한 색이고 길이는 가장 큰 값 대비 비율이다. 음수(환불이 더 큰 경우)는 막대 없이 금액만 적는다.
- **없는 것**: 툴팁, 축, 그리드, 범례, 원형 차트, 세로 막대. 모든 막대에 금액이 적혀 있어 그 자체로 표 역할을 한다.

## 레이아웃
- 본문 최대 너비는 대시보드 960px, 랜딩 1200px이다. 페이지 좌우 여백은 `space-xl`(32px)이다.
- 정렬은 좌측 정렬이 기본이다. 랜딩 히어로도 좌측 정렬이다.
- 대시보드 페이지 바탕은 `surface-soft`, 카드 안쪽 여백과 카드 사이는 `space-lg`(24px), 랜딩 섹션 위아래는 `space-section`(96px)이다.
- 대시보드는 상단 내비게이션(`AppHeader`: 홈 / 월별 추이 / 설정 + 플랜 배지)을 쓰고 사이드바는 두지 않는다.
- 모바일 폭(375px)에서 깨지지 않아야 한다. 표는 가로 스크롤을 허용한다.

## 타이포그래피
- 글꼴은 한글 글꼴 Pretendard 하나다. 앱에서는 `pretendard` 패키지의 dynamic subset CSS를 루트 레이아웃에서 import한다(CDN을 쓰지 않는다). 대체 글꼴 순서는 `tokens.css`의 `--font-sans`를 따른다.
- 글자 크기·굵기·줄 간격은 `tokens.json`의 글자 스타일(`display-lg` … `number-md`)만 쓴다. 임의 크기를 만들지 않는다.

## 애니메이션
- 허용하는 것은 버튼·링크 색 전환(`transition-colors duration-150`), 분석 중 스피너 회전(`prefers-reduced-motion`이면 느리게), 마우스를 올린 리포트 카드의 `shadow-soft`뿐이다.
- 그 외 모든 애니메이션(등장 효과, 스크롤 연출, 숫자 카운트업)은 금지한다.

## 아이콘
- `lucide-react`를 `strokeWidth={1.5}`, 크기 20~24px, 색 `body` 또는 `primary`로 쓴다.
- 목록·업로드 영역의 아이콘은 디자인 시스템처럼 원판(`radius-full`, 바탕 `surface-strong` / `primary-soft` / `danger-soft`) 위에 놓는다.
