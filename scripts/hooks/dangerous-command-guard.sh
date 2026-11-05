#!/usr/bin/env bash
# Dangerous Command Guard — Codex/Claude Code PreToolUse[Bash|PowerShell]
# 되돌리기 어려운 명령을 실행 전에 차단한다.
#
# 원본: harness_framework 템플릿 .claude/settings.json의 인라인 훅
#   if echo "$CLAUDE_TOOL_INPUT" | grep -qE 'rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|DROP\s+TABLE'; then ... exit 1; fi
# 원본이 동작하지 않던 이유:
#   - 훅 입력은 stdin JSON으로 들어온다. $CLAUDE_TOOL_INPUT 환경 변수는 없어서 늘 빈 문자열을 검사했다.
#   - exit 1은 차단이 아니라 경고다. 차단은 exit 2 또는 permissionDecision "deny" JSON이다.
#   - matcher가 Bash뿐이라 Windows의 PowerShell 도구는 검사하지 않았다.
#
# 차단 대상 (원본의 4가지 + 같은 의미의 변형):
#   rm -rf      : -fr, -Rf, -r -f, --recursive --force, 옵션이 뒤에 오는 경우,
#                 PowerShell Remove-Item -Recurse -Force (rm/ri/del/rd 별칭 포함)
#   git push 강제 : --force, --force-with-lease, -f, +refspec
#   git reset --hard
#   DROP TABLE  : 대소문자 무관
# 따옴표 안의 문자열도 검사한다 (bash -c "rm -rf ..." 대비). 그래서 echo 등으로 이 문구를 출력하는 것도 막힌다.

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
  echo "COMMAND GUARD: python을 찾을 수 없어 검사를 건너뜁니다." >&2
  exit 0
fi

read -r -d '' GUARD_PY <<'PY'
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
command = tool_input.get("command")
if not isinstance(command, str) or not command.strip():
    sys.exit(0)


def segments(cmd):
    """명령을 ; && || | & 줄바꿈 단위로 나누고 토큰 리스트로 돌려준다."""
    cleaned = re.sub(r"[\"'`()]|\$\(", " ", cmd)
    for seg in re.split(r"[;&|\n]+", cleaned):
        tokens = seg.split()
        if tokens:
            yield tokens


def name(token):
    return re.split(r"[\\/]", token)[-1].lower()


def after(tokens, word):
    """tokens에서 word 다음에 오는 토큰들 (없으면 None)."""
    for i, t in enumerate(tokens):
        if name(t) == word:
            return tokens[i + 1:]
    return None


def unix_rm_rf(tokens):
    rest = after(tokens, "rm")
    if rest is None:
        return False
    recursive = force = False
    for t in rest:
        if t == "--":
            break
        if t in ("--recursive",):
            recursive = True
        elif t == "--force":
            force = True
        elif t.startswith("-") and not t.startswith("--"):
            letters = t[1:]
            recursive |= "r" in letters or "R" in letters
            force |= "f" in letters
    return recursive and force


def powershell_remove_recurse_force(tokens):
    for i, t in enumerate(tokens):
        if name(t) not in ("remove-item", "ri", "rm", "del", "erase", "rd", "rmdir"):
            continue
        opts = [o.lower().split(":")[0].lstrip("-") for o in tokens[i + 1:] if o.startswith("-")]
        recurse = any(o and "recurse".startswith(o) for o in opts)
        force = any(len(o) >= 2 and "force".startswith(o) for o in opts)
        if recurse and force:
            return True
    return False


def git_sub(tokens, sub):
    rest = after(tokens, "git")
    if rest is None:
        return None
    for i, t in enumerate(rest):
        if t == sub:
            return rest[i + 1:]
    return None


def git_push_force(tokens):
    rest = git_sub(tokens, "push")
    if rest is None:
        return False
    for t in rest:
        if t.startswith("--force"):
            return True
        if t.startswith("-") and not t.startswith("--") and "f" in t[1:]:
            return True
        if t.startswith("+") and len(t) > 1:
            return True
    return False


def git_reset_hard(tokens):
    rest = git_sub(tokens, "reset")
    return rest is not None and "--hard" in rest


CHECKS = [
    ("rm -rf", unix_rm_rf),
    ("Remove-Item -Recurse -Force", powershell_remove_recurse_force),
    ("git push --force", git_push_force),
    ("git reset --hard", git_reset_hard),
]

found = None
for tokens in segments(command):
    for label, check in CHECKS:
        if check(tokens):
            found = label
            break
    if found:
        break

if not found and re.search(r"\bdrop\s+table\b", command, re.IGNORECASE):
    found = "DROP TABLE"

if found:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"BLOCKED: 위험한 명령어가 감지되었습니다 ({found}). "
                "꼭 필요한 작업이면 사용자에게 직접 실행해 달라고 요청하세요."
            ),
        }
    }))
PY

printf '%s' "$INPUT" | "$PY" -c "$GUARD_PY"
exit 0
