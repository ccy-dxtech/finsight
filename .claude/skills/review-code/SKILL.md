---
name: review-code
description: diff(브랜치 범위, staged 변경, GitHub PR)를 correctness·security·conventions 세 차원의 서브에이전트로 병렬 리뷰하고, docs/REVIEW_RULES.md의 심각도 4단계·인라인 코멘트 4줄·PR 요약·GATE 줄 형식으로 합쳐 낸다. "/review-code", "PR 리뷰", "커밋 전 리뷰", "심각도 매겨줘"를 요청받았을 때, 또는 pre-commit hook·GitHub Action이 헤드리스로 부를 때 쓴다.
argument-hint: "[비움=main...HEAD | --staged | PR번호 | git 범위]"
---

# review-code

기준은 `docs/REVIEW_RULES.md` 하나다. 이 스킬은 절차와 출력만 정한다. 룰·심각도·포맷은 룰 파일을 따른다.

## 1. 리뷰 대상 정하기

`$ARGUMENTS`로 diff 명령을 하나 정한다. 이후 모든 단계는 이 명령을 그대로 쓴다.

| 인자 | diff 명령 |
|---|---|
| 비어 있음 | `git diff main...HEAD` |
| `--staged` | `git diff --cached` |
| 숫자 또는 `#숫자` | `gh pr diff <숫자>` |
| 그 외 | `git diff <인자>` |

`<diff 명령> --stat`(PR이면 `gh pr diff <숫자> --name-only`)으로 바뀐 파일을 확인한다. diff가 비어 있으면 "리뷰할 변경이 없음"과 `GATE: critical=0 major=0 minor=0 nit=0`만 출력하고 끝낸다.

바뀐 파일 전체를 읽을 폴더(이하 `<읽을 폴더>`)는 작업 폴더다. 단, PR 번호이고 `git rev-parse HEAD`가 `gh pr view <숫자> --json headRefOid -q .headRefOid`와 다르면 PR head를 worktree로 꺼내 그 경로를 `<읽을 폴더>`로 쓴다. 리뷰가 끝나면 worktree를 지운다.

```bash
git fetch origin pull/<숫자>/head:review-pr-<숫자>
git worktree add .claude/worktrees/review-pr-<숫자> review-pr-<숫자>
# 리뷰가 끝난 뒤
git worktree remove .claude/worktrees/review-pr-<숫자> && git branch -D review-pr-<숫자>
```

인자가 `--staged`이면 커밋 직전 빠른 패스다. 2단계의 서브에이전트를 띄우지 말고, 공통 프롬프트 틀의 1~3번을 세 차원 모두에 대해 혼자 한 번에 수행한 뒤 3단계로 간다.

## 2. 세 서브에이전트를 한 메시지에서 병렬로 띄우기

Agent 도구(`subagent_type: general-purpose`)를 **한 응답에 세 번** 호출한다. 각 프롬프트는 아래 공통 틀에 차원별 칸만 바꿔 넣는다.

| 차원 | 너는 이것만 본다 | 맡는 룰 | 보지 않는 것 |
|---|---|---|---|
| correctness | 버그: 로직 오류, 경계값, null·빈 배열, 비동기 누락(`await`), 에러 처리 누락, 금액 계산, 웹훅 중복 처리 | R5, R6 | 보안, 스타일·관례 |
| security | 인증·결제·데이터 노출: 비밀값, RLS, Pro 판단 위치, 웹훅 서명, 원본 저장, 입력 검증, 일반 웹 취약점 | R1, R2, R3, R4, R7, S | 일반 버그, 스타일·관례 |
| conventions | 프로젝트 관례: 폴더 배치, 한국어 문구, `@theme` 토큰, 테스트 동반, 네이밍 | R8 | 버그, 보안 |

공통 프롬프트 틀:

```
너는 FinSight PR 리뷰어다. 너는 <차원>만 본다: <너는 이것만 본다>.
<보지 않는 것>은 다른 리뷰어가 보니 지적하지 마라.

1. docs/REVIEW_RULES.md를 읽어라. 너의 룰은 <맡는 룰>이다. "리뷰 범위"와 "심각도 4단계"를 따른다.
2. `<diff 명령>`으로 diff를 보고, 필요하면 바뀐 파일 전체와 관련 파일을 <읽을 폴더>에서 읽어라.
3. 지적마다 다음 JSON 객체 하나를 만든다. 지적이 없으면 빈 배열을 낸다.
   {"path": "src/...", "line": <diff의 새 파일 기준 줄 번호, diff에 + 또는 문맥으로 보이는 줄>,
    "severity": "critical|major|minor|nit", "rule": "R6" 또는 null,
    "title": "...", "tldr": "...", "good": "...", "fix": "<붙여넣을 수 있는 코드>"}
4. 마지막 메시지는 ```json 코드 블록 하나에 배열만 담아라. 다른 설명은 붙이지 마라.
```

## 3. 취합: dedup → 심각도 재조정

세 결과를 한 목록으로 합친 뒤 다음 순서로 정리한다.

1. **dedup**: 같은 `path`에서 줄 차이가 3 이내이고 같은 문제를 가리키면 하나로 합친다. 심각도는 높은 쪽, 설명은 더 구체적인 쪽을 남긴다.
2. **재확인**: 🔴🟠 지적은 해당 줄을 직접 열어 탐지 신호가 실제로 있는지 본다. 없으면 버린다. 외부 SDK 관련 지적은 `node_modules`의 타입·코드로 확인한다.
3. **재조정**: `docs/REVIEW_RULES.md` "리뷰 범위"의 "확신이 없으면 한 단계 낮춘다", "🔴는 악용·손해를 한 문장으로 쓸 수 있을 때만"을 적용한다.
4. **집계**: 남은 지적을 심각도별로 센다. 판정은 critical ≥ 1이면 `Blocked`, major ≥ 1이면 `Changes Requested`, 그 외 `Approve`.

## 4. 출력

아래 세 부분을 이 순서로 출력한다.

1. **PR 요약**: `docs/REVIEW_RULES.md` "PR 요약" 형식 그대로. 마지막 줄이 `GATE: ...`다.
2. **인라인 코멘트**: 지적마다 `### path:line` 제목 아래에 룰 파일의 4줄 형식. 심각도 높은 순.
3. **기계용 JSON**: 마지막 ```json 블록 하나. hook과 GitHub Action은 이 블록만 읽는다.

```json
{
  "verdict": "Changes Requested",
  "counts": { "critical": 0, "major": 1, "minor": 2, "nit": 1 },
  "comments": [
    { "path": "src/lib/report/total.ts", "line": 12, "severity": "major", "body": "<4줄 인라인 코멘트 원문>" }
  ]
}
```

`counts`와 PR 요약의 집계표, `GATE:` 줄은 같은 숫자여야 한다.
