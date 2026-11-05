#!/usr/bin/env bash
# TDD Guard Hook — Codex/Claude Code PreToolUse[Edit|Write|MultiEdit]
# 구현 파일(.ts/.tsx/.js/.jsx)을 만들거나 고칠 때 대응하는 테스트 파일이 없으면 차단한다.
#
# 원본:
# https://github.com/jha0313/codex-live-demo/blob/feat-0-mvp/.codex/hooks/tdd-guard.sh
# (그 원본의 원본: jha0313/YOUTUBE harness_demo/scripts/hooks/tdd-guard.sh)
#
# 이 프로젝트에서 바꾼 점 (판정 규칙은 원본과 동일):
#   - 훅 입력 JSON을 argv가 아니라 stdin으로 Python에 넘긴다.
#     원본은 큰 Write에서 "Argument list too long"으로 실패해 검사 없이 통과시켰다.
#   - Windows 경로(C:\...)의 백슬래시를 /로 바꾼다.
#     원본은 Windows에서 types/, page.tsx 같은 예외 규칙이 걸리지 않아 오탐 차단했다.
#   - 예외 규칙은 프로젝트 기준 상대경로에 적용한다.
#     원본은 절대경로 전체에 *test* 를 걸어, 프로젝트 경로에 test가 들어가면 가드가 꺼졌다.
#   - 입출력을 UTF-8 / ASCII 이스케이프 JSON으로 고정한다 (Windows 기본 인코딩 cp949 대비).
#   - Codex apply_patch 입력(.tool_input.command의 *** Add/Update File:) 지원은 그대로 둔다.

set -u

INPUT=$(cat)

if [ -z "$INPUT" ]; then
  exit 0
fi

PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "TDD GUARD: python을 찾을 수 없어 검사를 건너뜁니다." >&2
  exit 0
fi

if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  PROJECT_ROOT="${CLAUDE_PROJECT_DIR//\\//}"
else
  PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
fi
PROJECT_ROOT="${PROJECT_ROOT%/}"

deny() {
  printf '%s' "$1" | "$PY" -c '
import json
import sys

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": sys.stdin.buffer.read().decode("utf-8", "replace"),
    }
}))
'
}

read -r -d '' EXTRACT_PY <<'PY'
import json
import re
import sys

try:
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace"))
except Exception:
    sys.exit(0)
if not isinstance(payload, dict):
    sys.exit(0)

tool_input = payload.get("tool_input")
if not isinstance(tool_input, dict):
    sys.exit(0)

items = []

for key in ("file_path", "path", "filename"):
    value = tool_input.get(key)
    if isinstance(value, str) and value:
        items.append(("update", value))

command = tool_input.get("command") or tool_input.get("cmd") or ""
if isinstance(command, str):
    for line in command.splitlines():
        match = re.match(r"^\*\*\* (Add|Update|Delete) File: (.+)$", line)
        if match:
            items.append((match.group(1).lower(), match.group(2)))
            continue
        match = re.match(r"^\*\*\* Move to: (.+)$", line)
        if match:
            items.append(("update", match.group(1)))

out = []
seen = set()
for action, path in items:
    path = path.strip().replace("\\", "/")
    key = (action, path)
    if key in seen:
        continue
    seen.add(key)
    out.append(f"{action}\t{path}\n")
sys.stdout.buffer.write("".join(out).encode("utf-8"))
PY

PATHS=$(printf '%s' "$INPUT" | "$PY" -c "$EXTRACT_PY")

if [ -z "$PATHS" ]; then
  exit 0
fi

has_test_for() {
  local file_path="$1"
  local dir_name base_name parent_dir ext

  dir_name=$(dirname "$file_path")
  base_name=$(basename "$file_path" | sed -E 's/\.(ts|tsx|js|jsx)$//')
  parent_dir=$(dirname "$dir_name")

  for ext in ts tsx js jsx; do
    [ -f "${dir_name}/${base_name}.test.${ext}" ] && return 0
    [ -f "${dir_name}/${base_name}.spec.${ext}" ] && return 0
    [ -f "${dir_name}/__tests__/${base_name}.test.${ext}" ] && return 0
    [ -f "${dir_name}/__tests__/${base_name}.spec.${ext}" ] && return 0
    [ -f "${parent_dir}/__tests__/${base_name}.test.${ext}" ] && return 0
    [ -f "${parent_dir}/__tests__/${base_name}.spec.${ext}" ] && return 0
    [ -f "${PROJECT_ROOT}/src/__tests__/${base_name}.test.${ext}" ] && return 0
    [ -f "${PROJECT_ROOT}/src/__tests__/${base_name}.spec.${ext}" ] && return 0
  done

  return 1
}

while IFS=$'\t' read -r action file_path; do
  [ -z "$file_path" ] && continue
  [ "$action" = "delete" ] && continue

  # 상대경로(apply_patch)는 프로젝트 루트 기준으로 해석한다.
  case "$file_path" in
    /*|[A-Za-z]:/*) ;;
    *) file_path="${PROJECT_ROOT}/${file_path#./}" ;;
  esac

  # 예외 규칙은 프로젝트 내부 경로("/src/lib/x.ts" 형태)에만 적용한다.
  rel="/${file_path#"$PROJECT_ROOT"/}"

  case "$rel" in
    *test*|*spec*|*.test.*|*.spec.*|*__tests__*) continue ;;
  esac

  case "$rel" in
    *.json|*.css|*.scss|*.md|*.yml|*.yaml|*.env*|*.config.*|*tailwind*|*postcss*|*next.config*|*tsconfig*) continue ;;
  esac

  case "$rel" in
    */types/*|*/types.ts|*/types.d.ts) continue ;;
  esac

  case "$rel" in
    */layout.tsx|*/layout.ts|*/page.tsx|*/page.ts|*/loading.tsx|*/error.tsx|*/not-found.tsx|*/globals.css) continue ;;
  esac

  case "$rel" in
    *.ts|*.tsx|*.js|*.jsx)
      if ! has_test_for "$file_path"; then
        base_name=$(basename "$file_path" | sed -E 's/\.(ts|tsx|js|jsx)$//')
        deny "TDD GUARD: '${base_name}'에 대한 테스트 파일이 존재하지 않습니다. 구현 코드를 작성하기 전에 테스트를 먼저 작성하세요. (테스트 파일 예: ${base_name}.test.ts)"
        exit 0
      fi
      ;;
  esac
done <<< "$PATHS"

exit 0
