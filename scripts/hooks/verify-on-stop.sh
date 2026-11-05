#!/usr/bin/env bash
# Verify-on-Stop Hook — Codex/Claude Code Stop
# 턴이 끝날 때 npm run lint → build → test 를 차례로 돌려 검증한다.
#
# 원본: harness_framework 템플릿 .claude/settings.json의 인라인 훅
#   npm run lint 2>&1 && npm run build 2>&1 && npm run test 2>&1
# 원본의 문제와 바꾼 점:
#   - package.json이 없으면(앱 스캐폴딩 전) 매 턴 실패했다 → 검증할 것이 없으면 통과.
#   - 실패해도 exit 1이라 Claude는 오류를 보지 못하고 그대로 끝났다
#     → exit 2 + stderr로 오류를 Claude에게 돌려줘 고치게 한다.
#   - 무한 루프 방지: 이 훅 때문에 이미 한 번 이어서 작업한 경우(stop_hook_active=true)에는
#     다시 막지 않고 사용자에게 경고만 남긴다(exit 1).
#   - 없는 스크립트는 건너뛴다(--if-present). 예: lint만 아직 없는 경우.
#   - Claude의 현재 작업 폴더가 아니라 프로젝트 루트($CLAUDE_PROJECT_DIR)에서 실행한다.

set -u

INPUT=$(cat)

ROOT="${CLAUDE_PROJECT_DIR:-}"
ROOT="${ROOT//\\//}"
if [ -z "$ROOT" ]; then
  ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
fi
cd "$ROOT" || exit 0

if [ ! -f package.json ]; then
  exit 0
fi

STOP_HOOK_ACTIVE=false
if printf '%s' "$INPUT" | grep -qE '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  STOP_HOOK_ACTIVE=true
fi

LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT

for script in lint build test; do
  if ! npm run --if-present "$script" >"$LOG" 2>&1; then
    if [ "$STOP_HOOK_ACTIVE" = true ]; then
      {
        echo "VERIFY: 'npm run $script'이 여전히 실패합니다. 자동 재시도는 한 번만 하므로 직접 확인이 필요합니다."
        tail -n 20 "$LOG"
      } >&2
      exit 1
    fi
    {
      echo "VERIFY: 'npm run $script' 실패. 아래 오류를 고친 뒤 lint → build → test 가 모두 통과하는지 확인하고 마무리하세요."
      echo "--- 출력 마지막 60줄 ---"
      tail -n 60 "$LOG"
    } >&2
    exit 2
  fi
done

exit 0
