# Lighthouse 성능 루프 기록

`scripts/perf_loop.py`가 바퀴마다 남긴 전/후 숫자다. 로컬 프로덕션 빌드(`next start -p 3100`)를 모바일로 페이지마다 3회 쟀다.
게이트는 `perf/gate.json`의 바이트·항목 수(실행마다 같은 값)다. 점수·LCP·TBT·CLS는 출렁이므로 3회 중앙값을 참고로만 적는다.

## 2026-11-21 09:13 실행

| 바퀴 | 페이지 | 상태 | 점수 | LCP ms | TBT ms | CLS | 총 바이트 | JS 바이트 | 폰트 바이트 | render-blocking | 레거시 JS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | / | 기준선 | 100 | 916 | 79 | 0.010 | 438,163 | 143,651 | 265,088 | 1 | 13,909 |
| 0 | /login | 기준선 | 100 | 909 | 28 | 0.001 | 321,152 | 212,319 | 81,612 | 1 | 13,909 |
| 1 | / | 적용 | 100 | 908 | 55 | 0.009 | 438,165 | 143,651 | 265,088 | 1 | 13,909 |
| 1 | /login | 적용 | 100 | 906 | 46 | 0.001 | 252,584 | 143,790 | 81,612 | 1 | 13,909 |

- 바퀴 0 게이트 미달: / render_blocking 1 > 0, / legacy_js_bytes 13909 > 0, /login render_blocking 1 > 0, /login legacy_js_bytes 13909 > 0, /login script_bytes 212319 > 160000
- 바퀴 1 게이트 미달: / render_blocking 1 > 0, / legacy_js_bytes 13909 > 0, /login render_blocking 1 > 0, /login legacy_js_bytes 13909 > 0

멈춤: (진행 중)
