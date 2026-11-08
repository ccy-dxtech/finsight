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
#   - 훅 입력 JSON의 cwd가 속한 git 저장소 루트에서 실행한다.
#     $CLAUDE_PROJECT_DIR은 worktree 세션에서도 세션을 시작한 원래 저장소를 가리켜,
#     worktree에서 고친 코드 대신 main 체크아웃을 검증했다. cwd가 없으면 예전처럼
#     $CLAUDE_PROJECT_DIR → 현재 폴더의 git 루트 순서로 정한다.
#   - 마지막으로 모두 통과했을 때와 작업 트리가 같으면 다시 돌리지 않는다.
#     질문에 답만 한 턴에도 매번 24~34초씩 걸렸다. 작업 트리는 추적 파일과 무시되지 않은
#     새 파일의 내용으로 만든 git tree 해시로 비교한다(무시된 .next 등은 영향 없음).
#     해시는 통과했을 때만 git 폴더의 verify-on-stop.stamp에 적는다(worktree마다 따로).

set -u

INPUT=$(cat)

PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

HOOK_CWD=""
if [ -n "$PY" ] && [ -n "$INPUT" ]; then
  HOOK_CWD=$(printf '%s' "$INPUT" | "$PY" -c '
import json
import sys

try:
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace"))
except Exception:
    sys.exit(0)
cwd = payload.get("cwd") if isinstance(payload, dict) else None
if isinstance(cwd, str):
    sys.stdout.buffer.write(cwd.encode("utf-8"))
')
fi

ROOT=""
if [ -n "$HOOK_CWD" ]; then
  ROOT=$(git -C "$HOOK_CWD" rev-parse --show-toplevel 2>/dev/null)
fi
if [ -z "$ROOT" ]; then
  ROOT="${CLAUDE_PROJECT_DIR:-}"
  ROOT="${ROOT//\\//}"
fi
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

STAMP_FILE=""
TREE=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  STAMP_FILE=$(git rev-parse --git-path verify-on-stop.stamp)
  TMP_INDEX=$(git rev-parse --git-path verify-on-stop.index)
  rm -f "$TMP_INDEX"
  cp "$(git rev-parse --git-path index)" "$TMP_INDEX" 2>/dev/null || :
  if GIT_INDEX_FILE="$TMP_INDEX" git add -A >/dev/null 2>&1; then
    TREE=$(GIT_INDEX_FILE="$TMP_INDEX" git write-tree 2>/dev/null)
  fi
  rm -f "$TMP_INDEX"
  if [ -n "$TREE" ] && [ -f "$STAMP_FILE" ] && [ "$(cat "$STAMP_FILE")" = "$TREE" ]; then
    exit 0
  fi
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

if [ -n "$TREE" ] && [ -n "$STAMP_FILE" ]; then
  printf '%s\n' "$TREE" > "$STAMP_FILE"
fi

exit 0
