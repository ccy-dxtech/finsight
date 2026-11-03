# UI 디자인 가이드

## 디자인 원칙
1. **숫자가 주인공이다.** 화면에서 가장 먼저 읽혀야 하는 것은 금액이다. 장식은 숫자를 가리지 않는다.
2. **차분한 금융 도구다.** 랜딩도 대시보드와 같은 톤을 쓴다. 과장된 마케팅 연출은 하지 않는다.
3. **색은 의미가 있을 때만 쓴다.** 초록은 주요 행동(버튼)과 데이터 막대에만 쓴다. 나머지는 무채색이다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |
| 이모지 아이콘, 반짝이(✨) 장식 | AI 기능 강조용 클리셰 |

## 색상 (라이트 모드만)
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | `bg-white` (#ffffff) |
| 카드·섹션 구분 | `bg-white` + `border-neutral-200` (면 대신 선으로 구분) |
| 보조 영역(표 헤더, 업로드 영역 hover) | `bg-neutral-50` |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트, 금액 | `text-neutral-900` |
| 본문 | `text-neutral-700` |
| 보조, 라벨 | `text-neutral-500` |
| 비활성 | `text-neutral-400` |

### 포인트·데이터·시맨틱 색상
| 용도 | 값 |
|------|------|
| 포인트(주요 버튼, 차트 막대) | `green-700` (#15803d), 흰 배경 대비 3:1 이상 검증됨 |
| 포인트 hover·선택 | `green-800` (#166534) |
| 포인트 연한 배경(Pro 배지, 선택 상태) | `bg-green-50 text-green-800` |
| 오류 | `text-red-600` (#dc2626), 반드시 아이콘과 문구를 함께 표시 |
| 증가·감소 | 색을 쓰지 않는다. `▲ 12%` / `▼ 5%`처럼 기호와 부호로만 표시 |

- 텍스트에는 데이터 색(초록)을 쓰지 않는다. 금액·라벨은 텍스트 색을 쓴다.

## 컴포넌트
### 카드
```
rounded-md border border-neutral-200 bg-white p-6
```

### 버튼
```
Primary:   rounded-md bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 disabled:bg-neutral-300
Secondary: rounded-md border border-neutral-300 px-4 py-2.5 text-sm text-neutral-800 hover:bg-neutral-50
Text:      text-sm text-neutral-500 hover:text-neutral-900
Danger:    rounded-md border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50  (데이터 전체 삭제, 확인 대화상자 필수)
```

### 업로드 영역
```
rounded-md border border-dashed border-neutral-300 p-8 hover:bg-neutral-50
```
- 지원 형식(CSV, xls, xlsx), 5MB, 3,000건 한도와 남은 횟수를 영역 안에 적는다.

### 진행 표시 (분석 중)
- 세 단계(파일 읽기 → 카테고리 분류 → 리포트 작성)를 세로 목록으로 보여준다.
- 완료한 단계는 체크 아이콘, 현재 단계는 스피너, 남은 단계는 `text-neutral-400`으로 표시한다.
- "분석 중에는 이 화면을 닫지 마세요" 문구를 함께 보여준다.

### 잠금 (Free의 월별 추이)
- 화면 자리에 카드 하나를 둔다. 자물쇠 아이콘, 한 줄 설명, Primary "Pro로 업그레이드 (월 1,000원)" 버튼을 넣는다.
- 가짜 차트를 흐리게 깔지 않는다.

### 입력 필드
```
rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-green-700 focus:outline-none
```

## 숫자 표시
- 금액은 `Intl.NumberFormat('ko-KR')`로 `12,500원`처럼 표시한다. 음수는 `-12,500원`이다.
- 금액이 나오는 모든 곳에 `tabular-nums`를 쓴다. 표의 금액은 오른쪽 정렬한다.
- 날짜는 `2026.10.03` 형식, 월은 `2026년 10월` 형식으로 쓴다.

## 차트
외부 라이브러리 없이 HTML/CSS 막대로 그린다(ADR-013). 색은 `green-700` 한 가지만 쓰고, 10색 팔레트는 만들지 않는다.

| 화면 | 데이터 | 형태 |
|---|---|---|
| 리포트 상세 | 카테고리별 지출(한 업로드) | 가로 막대, 금액 내림차순, 0원 카테고리는 숨김. 막대 끝에 금액 직접 표기 |
| 월별 추이 | 월별 총지출 | 세로 막대, 시간순. 가장 최근 달만 금액 직접 표기, 나머지는 툴팁 |
| 월별 추이 | 카테고리별 전월 대비 | 차트가 아닌 표: 카테고리 / 이번 달 / 지난 달 / 증감(▲▼ %) |
| 리포트 상세, 홈 | 총지출, 거래 건수, 남은 횟수 | 숫자 타일. 라벨(`text-sm text-neutral-500`) 위, 숫자(`text-3xl font-semibold tabular-nums`) 아래 |

- **막대**: 가로 막대 두께는 16~20px이다. 값이 있는 끝만 4px 둥글게 하고 기준선 쪽은 각지게 한다. 막대 사이 간격은 2px 이상이다. 음수 합계는 기준선 반대쪽으로 같은 색으로 그린다.
- **축과 그리드**: 그리드는 `border-neutral-200` 가로선만 쓴다. 축 글자는 `text-xs text-neutral-500`이다. 이중 축은 금지한다.
- **범례**: 계열이 하나뿐이므로 범례 상자는 두지 않는다. 차트 제목이 무엇을 보여주는지 말한다.
- **상호작용**: 막대 hover와 키보드 포커스에 툴팁(카테고리나 월, 금액, 거래 건수)을 띄운다. 히트 영역은 막대보다 크게(행 전체) 잡는다.
- **접근성**: 차트마다 같은 데이터를 담은 표를 제공한다. 카테고리 차트는 막대 옆에 금액이 적혀 있어 그 자체로 표 역할을 한다. 차트 컨테이너에는 `role="img"`와 요약 `aria-label`을 단다.

## 레이아웃
- 전체 너비는 `max-w-5xl mx-auto px-6`이다.
- 정렬은 좌측 정렬이 기본이다. 랜딩 히어로도 좌측 정렬이며, 가운데 정렬 히어로는 금지한다.
- 간격은 요소 사이 `gap-3`~`gap-4`, 섹션 사이 `space-y-10`(대시보드) / `py-20`(랜딩 섹션)이다.
- 대시보드는 상단 내비게이션(홈 / 월별 추이 / 설정 + 플랜 배지)을 쓰고 사이드바는 두지 않는다.
- 모바일 폭(375px)에서 깨지지 않아야 한다. 표는 가로 스크롤을 허용한다.

## 타이포그래피
- 글꼴은 시스템 글꼴 스택이다(`font-sans`, 한글은 Apple SD Gothic Neo / Malgun Gothic). 웹폰트는 추가하지 않는다.

| 용도 | 스타일 |
|------|--------|
| 랜딩 히어로 제목 | `text-4xl font-semibold tracking-tight text-neutral-900` |
| 페이지 제목 | `text-2xl font-semibold text-neutral-900` |
| 섹션·카드 제목 | `text-sm font-medium text-neutral-500` |
| 본문 | `text-sm text-neutral-700 leading-relaxed` |
| 숫자 타일 | `text-3xl font-semibold tabular-nums text-neutral-900` |

## 애니메이션
- 허용하는 것은 버튼·링크 색 전환(`transition-colors duration-150`)과 진행 표시의 스피너 회전뿐이다.
- 그 외 모든 애니메이션(등장 효과, 스크롤 연출, 숫자 카운트업)은 금지한다.

## 아이콘
- `lucide-react`를 `strokeWidth={1.5}`, 크기 16~20px로 쓴다.
- 아이콘을 둥근 배경 박스로 감싸지 않는다.
