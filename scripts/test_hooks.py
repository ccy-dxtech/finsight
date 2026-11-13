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

    def decision(self, path: Path, cwd: Path | None = None) -> str:
        payload = {
            "hook_event_name": "PreToolUse", "tool_name": "Write", "cwd": str(cwd or self.worktree),
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

    def test_allows_claude_workflow_script(self):
        # Claude Code 워크플로 스크립트는 agent()/pipeline() 전역에 기대어 단위 테스트를 붙일 수 없다.
        path = self.worktree / ".claude" / "workflows" / "review-code.js"
        self.assertEqual(self.decision(path), "allow")

    def test_allows_claude_workflow_script_with_lowercase_drive(self):
        # Claude Code는 cwd가 소문자 c:면 file_path도 c:로 넘기지만 git 루트는 C:로 나온다.
        # 그러면 상대경로를 못 구해 절대경로 전체로 비교하는데, 경로에 test가 있으면 *test* 규칙에
        # 걸려 무엇이든 통과한다(self.tmp는 hook-test-). 그래서 test가 없는 폴더에서 확인한다.
        base = Path(tempfile.mkdtemp(prefix="hookcase-"))
        self.addCleanup(remove_tree, base)
        repo = make_repo(base / "repo")
        if str(repo)[1:2] != ":":
            self.skipTest("드라이브 문자가 있는 Windows 경로에서만 의미가 있다")

        def lower_drive(path: Path) -> Path:
            return Path(str(path)[0].lower() + str(path)[1:])

        workflow = lower_drive(repo / ".claude" / "workflows" / "review-code.js")
        untested = lower_drive(repo / "src" / "lib" / "a.ts")
        self.assertEqual(self.decision(workflow, cwd=lower_drive(repo)), "allow")
        self.assertEqual(self.decision(untested, cwd=lower_drive(repo)), "deny")  # 가드가 켜져 있다는 대조군

    def test_still_blocks_untested_js_elsewhere_under_dot_claude(self):
        path = self.worktree / ".claude" / "skills" / "x" / "run.js"
        self.assertEqual(self.decision(path), "deny")


if __name__ == "__main__":
    unittest.main()
