#!/usr/bin/env bash
# git pre-commit hook — staged 변경을 /review-code --staged로 리뷰한다.
#
# 판정은 리뷰 출력의 GATE 줄로만 정한다(룰·심각도는 docs/REVIEW_RULES.md, GitHub Action과 같은 기준).
#   - critical ≥ 1 → 커밋 차단(exit 1). 급하면 git commit --no-verify
#   - major·minor·nit → 요약을 보여 주고 통과
#   - 리뷰가 실패하거나 GATE 줄이 없으면 → 경고만 남기고 통과(리뷰 인프라 문제로 커밋을 막지 않는다)
#
# 안쪽 claude -p는 disableAllHooks로 돌린다. 프로젝트 Stop hook(lint·build·test)과
# security-guidance 플러그인 hook이 커밋마다 함께 돌지 않게 하려는 것이다.
#
# 설치(.git/hooks는 버전 관리되지 않아 PC마다 한 번). 이 스크립트가 없는 브랜치·worktree에서는 그냥 통과한다:
#   printf '#!/bin/sh\nS="$(git rev-parse --show-toplevel)/scripts/hooks/pre-commit-review.sh"\n[ -f "$S" ] || exit 0\nexec bash "$S"\n' > .git/hooks/pre-commit

set -u

if git diff --cached --quiet; then
  exit 0
fi

echo "review-code: staged 변경을 리뷰하는 중이에요(1분 안팎)..." >&2

OUTPUT=$(claude -p "/review-code --staged" \
  --settings '{"disableAllHooks":true}' \
  --model sonnet \
  --no-session-persistence \
  --allowedTools "Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git rev-parse:*)" \
  2>&1)

GATE=$(printf '%s\n' "$OUTPUT" | grep -E '^GATE: critical=[0-9]+ major=[0-9]+ minor=[0-9]+ nit=[0-9]+' | tail -1)
if [ -z "$GATE" ]; then
  echo "review-code: 리뷰 결과(GATE 줄)를 받지 못해 검사 없이 통과합니다." >&2
  printf '%s\n' "$OUTPUT" | tail -5 >&2
  exit 0
fi

count() {
  printf '%s\n' "$GATE" | sed -E "s/.*$1=([0-9]+).*/\\1/"
}
CRITICAL=$(count critical)
MAJOR=$(count major)
MINOR=$(count minor)
NIT=$(count nit)

if [ "$CRITICAL" -eq 0 ] && [ "$MAJOR" -eq 0 ] && [ "$MINOR" -eq 0 ] && [ "$NIT" -eq 0 ]; then
  echo "review-code: $GATE" >&2
  exit 0
fi

# 사람이 읽을 부분만 보여 준다(마지막 기계용 JSON 블록은 뺀다).
printf '%s\n' "$OUTPUT" | awk '/^```json/ { exit } { print }' >&2

if [ "$CRITICAL" -gt 0 ]; then
  echo "" >&2
  echo "review-code: critical이 있어 커밋을 막았어요. 고친 뒤 다시 커밋하세요. 급하면 git commit --no-verify" >&2
  exit 1
fi

exit 0
