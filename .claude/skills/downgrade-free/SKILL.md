---
name: downgrade-free
description: FinSight 테스트 계정을 Pro에서 Free로 되돌린다. Polar sandbox의 Pro 구독을 즉시 해지(revoke)하고 Supabase profiles.plan을 'free'로 바꾼다. "프리로 내려줘", "다운그레이드", "Pro 해제", "무료로 되돌려", "결제 테스트 다시 하게 초기화"처럼 테스트 중 계정 플랜을 무료로 돌려 달라고 할 때 쓴다.
---

# Pro → Free 다운그레이드

테스트용이다. Polar는 sandbox만 건드린다(실제 청구 없음, ADR-003).

## 왜 두 쪽을 다 바꾸는가
- 플랜의 출처는 Polar 웹훅이다(ADR-004). Polar 구독을 해지하면 `subscription.revoked` 웹훅이 `profiles.plan`을 `free`로 바꾼다.
- 로컬에서는 Polar가 `localhost`로 웹훅을 보낼 수 없어 DB가 바뀌지 않는다. 그래서 스크립트가 DB도 직접 바꾼다. 웹훅이 닿는 환경이면 같은 값을 한 번 더 쓰는 것뿐이다.
- DB만 바꾸고 Polar 구독을 남기면 `/api/checkout`이 두 번째 구독을 만들 수 있고(같은 고객에 구독 2개), 나중에 오는 웹훅이 DB 값을 덮어쓴다.

## 실행

저장소 루트(worktree면 그 worktree 루트)에서 실행한다. 스크립트는 자기 위치 기준 `.env.local`을 읽는다.

1. **대상 계정 정하기**: 사용자가 이메일을 말하지 않았으면 Pro 계정 목록부터 본다.
   ```bash
   node .claude/skills/downgrade-free/downgrade-free.mjs
   ```
   - 한 명이면 그 계정으로 진행한다. 여러 명이면 어느 계정인지 사용자에게 묻는다.
2. **다운그레이드**
   ```bash
   node .claude/skills/downgrade-free/downgrade-free.mjs <이메일>
   ```
   - 상태만 보려면 `--dry-run`을 붙인다(아무것도 바꾸지 않음).
   - 순서: Polar의 Pro 상품 활성 구독을 모두 revoke → `profiles.plan = 'free'`, `updated_at = now()`.
   - Polar 호출이 실패하면 DB를 건드리지 않고 멈춘다(종료 코드 1).
   - 이미 free이고 Polar 구독도 없으면 아무것도 바꾸지 않는다. 여러 번 실행해도 된다.

## 출력 읽기

| 줄 | 뜻 |
|---|---|
| `Polar: 구독 <id> 해지 → canceled` | sandbox 구독을 즉시 해지했다 |
| `Polar: 활성 Pro 구독 없음` | Polar 쪽은 이미 정리돼 있다(SQL·E2E처럼 DB만 바꿔 Pro가 된 계정이면 정상) |
| `Polar: 건너뜀. ... 값이 없어` | `.env.local`의 `POLAR_ACCESS_TOKEN`·`POLAR_PRO_PRODUCT_ID`가 비었다. DB만 바뀐다 |
| `DB: pro → free` | 플랜을 바꿨다 |
| `오류: ...` | 멈춘 이유. Polar 401이면 토큰이 틀렸거나 sandbox 토큰이 아니다 |

## 보고
- 대상 계정, Polar에서 해지한 구독 수(또는 건너뛴 이유), DB 변경 전후 값을 짧게 알린다.
- Polar를 건너뛰었으면 그 사실을 꼭 말한다. Polar sandbox 대시보드(Sales > Subscriptions)에 그 계정의 활성 구독이 남아 있을 수 있다.
- 브라우저에 열린 화면은 새로고침해야 Free로 보인다. 플랜은 요청마다 서버가 `profiles`에서 읽는다.

## 하지 않는 것
- 이번 달 분석 횟수(`usage`)는 되돌리지 않는다. 필요하면 `docs/OPERATIONS.md` "이번 달 분석 횟수 되돌리기"를 쓴다.
- 거래·리포트 데이터는 지우지 않는다.
- Polar 고객(customer) 자체는 지우지 않는다. 다시 결제하면 같은 고객에 새 구독이 생긴다.
