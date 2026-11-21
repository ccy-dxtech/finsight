## review-code 요약
판정: Approve

리뷰 대상은 `git diff --cached`(`--staged`)입니다. 서브에이전트 없이 correctness·security·conventions 세 차원을 한 번에 봤습니다.

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 0 | 0 | 0 | 0 |

### 🔴🟠 지적
- 없음

확인한 내용:
- **correctness**: `formatCount`는 건수(`number`)에만 쓰이고 금액 계산에는 관여하지 않습니다. 그래서 R6(금액은 `bigint`)에 걸리지 않습니다. `Intl.NumberFormat("ko-KR")`로 쉼표를 붙이는 방식은 기존 `formatNumber`와 같습니다. 테스트가 0, 7, 12500을 확인합니다.
- **security**: 비밀값, 외부 호출, 입력 처리가 없는 순수 함수입니다.
- **conventions**: 새 함수는 `src/lib/format.ts`에 있고 같은 폴더의 `format.test.ts`가 짝으로 있습니다(R8 충족). 사용자에게 보이는 문구 "건"은 한국어입니다.

GATE: critical=0 major=0 minor=0 nit=0

```json
{
  "verdict": "Approve",
  "counts": { "critical": 0, "major": 0, "minor": 0, "nit": 0 },
  "comments": []
}
```