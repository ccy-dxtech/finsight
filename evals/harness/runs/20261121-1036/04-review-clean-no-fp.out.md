## review-code 요약
판정: Approve

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 0 | 0 | 0 | 0 |

### 🔴🟠 지적
없음

`--staged` 빠른 패스로 `src/lib/format.ts`와 `src/lib/format.test.ts`만 봤습니다.

- **금액(R6)**: `formatCount`는 거래 건수만 `number`로 받습니다. 금액이 아니라서 R6에 걸리지 않습니다. 금액 쪽 `formatAmount`는 그대로 `bigint`입니다.
- **테스트 동반(R8)**: `src/lib/`에 새로 넣은 함수에 `format.test.ts`의 테스트가 같이 들어왔습니다. 0, 한 자리, 천 단위 쉼표 경계를 확인합니다.
- **폴더 배치·문구(R8)**: 순수 로직이라 `src/lib/` 위치가 맞고, `건` 단위는 한국어입니다.
- **보안·비밀값**: 해당하는 변경이 없습니다.

참고: 작업 트리의 `AGENTS.md`와 `docs/BROWSER_TESTING.md` 수정은 staged에 없어서 이번 리뷰 범위가 아닙니다.

GATE: critical=0 major=0 minor=0 nit=0

```json
{
  "verdict": "Approve",
  "counts": { "critical": 0, "major": 0, "minor": 0, "nit": 0 },
  "comments": []
}
```