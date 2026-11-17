"""
scripts/hooks 훅 스크립트 테스트.

훅에 가짜 입력 JSON을 stdin으로 넣고, 임시 git 저장소에서 실행해 결과를 확인한다.
pytest 없이 표준 라이브러리만으로 돈다:

    python -m unittest scripts/test_hooks.py
"""

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HOOKS_DIR = Path(__file__).resolve().parent / "hooks"
GIT_BASH = Path(r"C:\Program Files\Git\bin\bash.exe")
BASH = str(GIT_BASH) if GIT_BASH.exists() else (shutil.which("bash") or "bash")

# lint·build·test가 실행되면 HOOK_TEST_LOG에 '<저장소 이름>:<스크립트>'를 한 줄 적는다.
# HOOK_TEST_FAIL과 이름이 같으면 실패(exit 1)한다.
LOG_JS = """\
const fs = require("fs");
const label = process.argv[2];
fs.appendFileSync(process.env.HOOK_TEST_LOG, label + "\\n");
process.exit(process.env.HOOK_TEST_FAIL === label ? 1 : 0);
"""


def git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


def make_repo(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    git(path, "init", "-q")
    git(path, "config", "user.email", "hook-test@example.com")
    git(path, "config", "user.name", "hook-test")
    git(path, "config", "core.autocrlf", "false")
    return path


def make_npm_repo(path: Path, name: str) -> Path:
    make_repo(path)
    (path / "log.js").write_text(LOG_JS, encoding="utf-8")
    scripts = {script: f"node log.js {name}:{script}" for script in ("lint", "build", "test")}
    package = {"name": name.lower(), "private": True, "scripts": scripts}
    (path / "package.json").write_text(json.dumps(package), encoding="utf-8")
    (path / ".gitignore").write_text("out/\n", encoding="utf-8")
    (path / "a.txt").write_text("v1", encoding="utf-8")
    git(path, "add", "-A")
    git(path, "commit", "-q", "-m", "init")
    return path


def run_hook(script: str, payload: dict, cwd: Path, **env) -> subprocess.CompletedProcess:
    return subprocess.run(
        [BASH, str(HOOKS_DIR / script)],
        input=json.dumps(payload), capture_output=True, text=True, encoding="utf-8",
        cwd=cwd, env={**os.environ, **env}, timeout=180,
    )


def remove_tree(path: Path):
    # git 객체 파일은 Windows에서 읽기 전용이라 권한을 풀고 지운다.
    def force(func, target, _):
        os.chmod(target, stat.S_IWRITE)
        func(target)

    if sys.version_info >= (3, 12):
        shutil.rmtree(path, onexc=force)
    else:
        shutil.rmtree(path, onerror=force)


class HookTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="hook-test-"))

    def tearDown(self):
        remove_tree(self.tmp)


class VerifyOnStopTest(HookTestCase):
    """main = 세션을 시작한 저장소(CLAUDE_PROJECT_DIR), worktree = 실제로 일하는 저장소(cwd)."""

    def setUp(self):
        super().setUp()
        self.log = self.tmp / "ran.log"
        self.main = make_npm_repo(self.tmp / "main", "A")
        self.worktree = make_npm_repo(self.tmp / "worktree", "B")

    def stop(self, cwd=None, fail=""):
        payload = {"hook_event_name": "Stop", "stop_hook_active": False}
        if cwd is not None:
            payload["cwd"] = str(cwd)
        return run_hook(
            "verify-on-stop.sh", payload, cwd=self.tmp,
            CLAUDE_PROJECT_DIR=str(self.main), HOOK_TEST_LOG=str(self.log), HOOK_TEST_FAIL=fail,
        )

    def ran(self):
        return self.log.read_text(encoding="utf-8").split() if self.log.exists() else []

    def test_checks_git_root_of_input_cwd_instead_of_project_dir(self):
        sub = self.worktree / "src"
        sub.mkdir()
        result = self.stop(cwd=sub)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.ran(), ["B:lint", "B:build", "B:test"])

    def test_falls_back_to_project_dir_without_cwd(self):
        result = self.stop()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.ran(), ["A:lint", "A:build", "A:test"])

    def test_skips_when_tree_is_unchanged_since_last_pass(self):
        self.stop(cwd=self.worktree)
        result = self.stop(cwd=self.worktree)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.ran(), ["B:lint", "B:build", "B:test"])

    def test_reruns_when_already_modified_file_changes_again(self):
        (self.worktree / "a.txt").write_text("v2", encoding="utf-8")
        self.stop(cwd=self.worktree)
        (self.worktree / "a.txt").write_text("v3", encoding="utf-8")
        self.stop(cwd=self.worktree)
        self.assertEqual(len(self.ran()), 6)

    def test_reruns_when_untracked_file_is_added(self):
        self.stop(cwd=self.worktree)
        (self.worktree / "new.txt").write_text("x", encoding="utf-8")
        self.stop(cwd=self.worktree)
        self.assertEqual(len(self.ran()), 6)

    def test_ignored_files_do_not_trigger_rerun(self):
        self.stop(cwd=self.worktree)
        (self.worktree / "out").mkdir()
        (self.worktree / "out" / "build.js").write_text("x", encoding="utf-8")
        self.stop(cwd=self.worktree)
        self.assertEqual(len(self.ran()), 3)

    def test_failure_is_reported_and_not_remembered(self):
        first = self.stop(cwd=self.worktree, fail="B:test")
        second = self.stop(cwd=self.worktree, fail="B:test")
        self.assertEqual(first.returncode, 2)
        self.assertIn("npm run test", first.stderr)
        self.assertEqual(second.returncode, 2)
        self.assertEqual(self.ran().count("B:lint"), 2)


class TddGuardTest(HookTestCase):
    """worktree는 원래 저장소 안 .claude/worktrees/<이름>에 생긴다."""

    def setUp(self):
        super().setUp()
        self.main = make_repo(self.tmp / "main")
        self.worktree = make_repo(self.main / ".claude" / "worktrees" / "fix-test-flake")
        (self.worktree / "src" / "lib").mkdir(parents=True)

    def decision(self, path: Path) -> str:
        payload = {
            "hook_event_name": "PreToolUse", "tool_name": "Write", "cwd": str(self.worktree),
            "tool_input": {"file_path": str(path), "content": "export {};\n"},
        }
        result = run_hook("tdd-guard.sh", payload, cwd=self.tmp, CLAUDE_PROJECT_DIR=str(self.main))
        self.assertEqual(result.returncode, 0, result.stderr)
        if not result.stdout.strip():
            return "allow"
        return json.loads(result.stdout)["hookSpecificOutput"]["permissionDecision"]

    def test_blocks_untested_file_in_worktree_whose_name_contains_test(self):
        self.assertEqual(self.decision(self.worktree / "src" / "lib" / "a.ts"), "deny")

    def test_allows_file_with_sibling_test(self):
        (self.worktree / "src" / "lib" / "a.test.ts").write_text("", encoding="utf-8")
        self.assertEqual(self.decision(self.worktree / "src" / "lib" / "a.ts"), "allow")


# 진짜 claude 대신 PATH 맨 앞에 두는 가짜. 받은 인자를 FAKE_CLAUDE_ARGS에 적고 FAKE_CLAUDE_OUTPUT을 출력한다.
FAKE_CLAUDE = """\
#!/usr/bin/env bash
printf '%s\\n' "$@" > "$FAKE_CLAUDE_ARGS"
printf '%s\\n' "$FAKE_CLAUDE_OUTPUT"
exit "${FAKE_CLAUDE_EXIT:-0}"
"""

REVIEW_OUTPUT = """\
## review-code 요약
판정: {verdict}

GATE: critical={c} major={m} minor={n} nit={t}

### src/a.ts:1
[🟡 minor] 예시 지적

```json
{{"verdict": "{verdict}"}}
```"""


class PreCommitReviewTest(HookTestCase):
    """git pre-commit에서 staged 변경을 /review-code --staged로 리뷰하고 GATE 줄로 통과·차단을 정한다."""

    def setUp(self):
        super().setUp()
        self.repo = make_repo(self.tmp / "repo")
        (self.repo / "a.txt").write_text("v1", encoding="utf-8")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-q", "-m", "init")
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        (bin_dir / "claude").write_text(FAKE_CLAUDE, encoding="utf-8", newline="\n")
        self.args_file = self.tmp / "claude-args.txt"
        self.path = str(bin_dir) + os.pathsep + os.environ["PATH"]

    def stage_change(self):
        (self.repo / "a.txt").write_text("v2", encoding="utf-8")
        git(self.repo, "add", "a.txt")

    def commit_hook(self, output="", exit_code=0):
        return subprocess.run(
            [BASH, str(HOOKS_DIR / "pre-commit-review.sh")],
            capture_output=True, text=True, encoding="utf-8", cwd=self.repo, timeout=60,
            env={**os.environ, "PATH": self.path, "FAKE_CLAUDE_ARGS": str(self.args_file),
                 "FAKE_CLAUDE_OUTPUT": output, "FAKE_CLAUDE_EXIT": str(exit_code)},
        )

    def review(self, c=0, m=0, n=0, t=0, verdict="Approve"):
        return REVIEW_OUTPUT.format(c=c, m=m, n=n, t=t, verdict=verdict)

    def test_skips_review_when_nothing_is_staged(self):
        result = self.commit_hook(self.review())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.args_file.exists())

    def test_runs_review_code_staged_with_hooks_disabled(self):
        self.stage_change()
        self.commit_hook(self.review())
        args = self.args_file.read_text(encoding="utf-8")
        self.assertIn("/review-code --staged", args)
        self.assertIn('"disableAllHooks":true', args)

    def test_blocks_commit_when_review_has_critical(self):
        self.stage_change()
        result = self.commit_hook(self.review(c=1, verdict="Blocked"))
        self.assertEqual(result.returncode, 1)
        self.assertIn("GATE: critical=1", result.stderr)
        self.assertIn("--no-verify", result.stderr)

    def test_passes_with_summary_when_highest_is_major(self):
        self.stage_change()
        result = self.commit_hook(self.review(m=1, n=2, verdict="Changes Requested"))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("GATE: critical=0 major=1", result.stderr)
        self.assertIn("[🟡 minor] 예시 지적", result.stderr)

    def test_summary_leaves_out_machine_json_block(self):
        self.stage_change()
        result = self.commit_hook(self.review(n=1))
        self.assertNotIn("```json", result.stderr)

    def test_passes_quietly_when_review_is_clean(self):
        self.stage_change()
        result = self.commit_hook(self.review())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("예시 지적", result.stderr)

    def test_lets_commit_through_with_warning_when_review_fails(self):
        self.stage_change()
        result = self.commit_hook("API error", exit_code=1)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("검사 없이 통과", result.stderr)


if __name__ == "__main__":
    unittest.main()
