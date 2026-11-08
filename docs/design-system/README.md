FinSight는 카드 명세서를 올리면 AI가 지출을 한국어 리포트로 정리해 주는 서비스예요. 화면은 흰 바탕에 초록 포인트 하나만 쓰는 차분한 금융 도구 톤이고, 숫자가 가장 먼저 읽혀야 해요.

## 원칙

- **포인트 색은 하나.** `primary`(초록)는 주요 버튼, 로고의 "Sight", 진행 막대, 차트 막대, 프로 배지, 강조 숫자에만 써요. 한 화면에 초록 버튼은 하나뿐이에요.
- **숫자가 먼저.** 총지출은 `number-xl`, 요약 숫자는 `number-lg`, 목록·표 금액은 `number-md`. 모든 금액은 고정폭 숫자(`fs-num` 계열)와 천 단위 쉼표로 쓰고, 단위(원·건·회)는 작게 붙여요.
- **한국어 기준.** 모든 문구는 해요체, 글꼴은 Pretendard, 줄바꿈은 어절 단위(`word-break: keep-all`).
- **필, 카드, 원.** 버튼·배지·탭은 `radius-pill`, 카드는 `radius-xl`, 아이콘 원판은 `radius-full`.
- **평평하게.** 카드는 1px `hairline` 외곽선. 그림자는 `shadow-soft` 한 단계(마우스를 올린 카드)뿐이에요.

## 문구 작성

- 해요체로 짧게 써요: "분석 중이에요. 1~2분 걸릴 수 있어요", "이미 분석한 파일이에요".
- 버튼 라벨은 짧은 명사형: "시작하기", "프로 구독하기", "대시보드로 가기", "구독 관리". 버튼에는 해요체를 쓰지 않아요.
- 플랜은 항상 "무료" / "프로"로 불러요. Free·Pro라고 쓰지 않아요.
- 오류 안내는 무슨 일이 있었는지 → 사용자가 할 일 → "횟수는 차감되지 않았어요" 순서로 써요.
- AI 인사이트는 판단이 아니라 관찰로 써요("배달 주문이 평소보다 많아요"). 나무라거나 겁주는 말, 느낌표, 이모지는 쓰지 않아요.
- 요금제·결제 버튼 근처에는 항상 "테스트 결제 환경이며 실제로 청구되지 않습니다"(`fs-testnote`)를 둬요.
- 금액: "1,284,500원", 기간: "10.01–10.31", 증감: "▲ +44,300원" / "▼ −70,500원".

## 색

- 바탕: 기본 `canvas`, 대시보드 페이지 바탕 `surface-soft`, 보조 버튼·트랙·아이콘 원판 `surface-strong`, 초록 옅은 바탕 `primary-soft`.
- 글자: 제목·숫자 `ink`, 본문 `body`, 보조 문구 `muted`, 비활성 `disabled`. 모두 각 바탕 위에서 4.5:1 이상이에요(`disabled` 제외).
- 경계: 구분선 `hairline`, 컨트롤 경계(업로드 점선, Google 버튼, 표 머리) `border-strong`(3:1).
- 증감: 지출 증가 `change-up`(빨강), 감소 `change-down`(파랑). 한국 금융 관례를 따르고 초록 포인트와 겹치지 않아요. 글자색 전용이고 반드시 ▲/▼와 부호를 함께 써요.
- 위험: `danger`(= `change-up`)는 "내 데이터 전체 삭제"와 오류 아이콘에만, `danger-soft`는 오류 안내 바탕.
- 차트: 카테고리별 지출과 월별 총지출 모두 같은 가로 막대(`fs-bar`)에 `primary` 한 색이에요(이름과 금액을 막대 옆에 직접 표기, 축·범례·원형 차트 없음). `primary-muted`는 커버 그림에만 써요.

## 타이포그래피

- 글꼴: **Pretendard Variable**(jsDelivr에서 `components/bundle.css`가 불러와요). 대체: Apple SD Gothic Neo, Noto Sans KR, 맑은 고딕.
- 제목: 랜딩 히어로 `display-lg`(48/700), 랜딩 섹션 `display-md`, 대시보드 페이지 제목 `title-lg`, 카드 제목 `title-md`, 업로드·분석 문구 `title-sm`.
- 본문: 히어로 부제 `body-lg`, 기본 `body-md`(줄간격 1.65), 보조 `body-sm`, 캡션 `caption`, 배지 `label`, 버튼 `button`, 헤더 탭 `nav-link`.
- 한글 제목은 굵게(700) 쓰고 자간을 살짝 좁혀요. 본문 자간은 0.
- 모바일에서 히어로 제목은 32px.

## 간격과 레이아웃

- 4px 단위: `space-xxs` 4 · `space-xs` 8 · `space-sm` 12 · `space-base` 16 · `space-md` 20 · `space-lg` 24 · `space-xl` 32 · `space-xxl` 48 · `space-section` 96.
- 정렬은 좌측 정렬이 기본이에요. 랜딩 히어로도 좌측 정렬이에요.
- 랜딩 섹션은 위아래 `space-section`. 대시보드 카드는 안쪽 `space-lg`, 카드 사이 `space-lg`.
- 대시보드 본문 최대 너비 960px, 랜딩 1200px.
- 목록 행 최소 높이 56px, 버튼 44px(큰 버튼 56px).

## 상태

- 버튼: 기본, 눌림(`primary-active`), 비활성(`primary-disabled`). 포커스는 2px `focus` 실선 링, 2px 띄움.
- 업로드 영역: 기본, 끌어다 놓는 중(`.is-over`), 횟수 소진(`.is-disabled`).
- 분석 중: 스피너와 문구만. 진행 단계는 보여주지 않아요.
- 결제 직후 웹훅 전: "결제 확인 중이에요" 기본 `Notice`.

## 화면별 구성

- `/` 랜딩: `Hero` → `StepList` → `PricingTier` → 푸터(`surface-soft`, `caption`).
- `/login`: 가운데 정렬. 로고(`/` 링크) → 한 문장(`body-lg`) → `fs-btn--google` 큰 버튼 하나.
- `/dashboard`: `AppHeader` → `UploadDropzone` → `UsageMeter` → `ReportListItem` 목록.
- `/dashboard/reports/[id]`: `StatSummary` → `CategoryBars` → `InsightList`(정기결제·이상 지출) → `SavingTip`.
- `/dashboard/trends`: 프로 `MonthlyChart` + `ChangeTable`, 무료 `LockedPanel`.
- `/dashboard/settings`: `SettingsRow` 목록.

## 아이콘

- 아이콘은 `lucide-react`의 외곽선 아이콘을 `strokeWidth={1.5}`, 20~24px로 쓰고 색은 `body` 또는 `primary`예요. 잠금 표시도 `Lock` 아이콘이에요(이모지 아님).
- 미리보기 HTML의 글자·기호(↑, !, ✓, ▶, 🔒)는 아이콘 자리 표시예요.
- 로고 파일은 없어요. "Fin"(`ink`) + "Sight"(`primary`)를 20px/800 글자로 써요.

## 컴포넌트

모든 컴포넌트는 HTML + `components/bundle.css`의 `fs-` 클래스로 만들어요(JS 번들 없음). `tokens.css` 다음에 `bundle.css`를 불러오세요.

## 하지 말 것

- 초록 외의 브랜드 색을 추가하지 않아요. 증감 빨강·파랑을 버튼 배경으로 쓰지 않아요.
- 원형 차트, 세로 막대 차트, 그라데이션, 어두운 배경 섹션을 쓰지 않아요(다크 모드는 MVP 범위 밖).
- 가운데 정렬 히어로, 잠금 화면 뒤에 흐린 미리보기 차트를 쓰지 않아요.
- 그림자를 더 만들지 않아요. 버튼에 각진 모서리를 쓰지 않아요.
