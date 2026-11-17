"""
scripts/review_gate.py 테스트. /review-code 출력의 GATE 줄로 PR을 3단계로 처리한다.

    python -m unittest scripts/test_review_gate.py
"""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from review_gate import apply_gate, decide, parse_gate  # noqa: E402


def output(c=0, m=0, n=0, t=0):
    return f"## review-code 요약\n판정: ...\n\nGATE: critical={c} major={m} minor={n} nit={t}\n"


class ParseGateTest(unittest.TestCase):
    def test_reads_counts_from_last_gate_line(self):
        text = output(c=1) + "\n" + output(m=2, t=3)
        self.assertEqual(parse_gate(text), {"critical": 0, "major": 2, "minor": 0, "nit": 3})

    def test_returns_none_without_gate_line(self):
        self.assertIsNone(parse_gate("API error"))


class DecideTest(unittest.TestCase):
    def test_critical_or_major_needs_human(self):
        self.assertEqual(decide(parse_gate(output(c=1, n=5))), "human")
        self.assertEqual(decide(parse_gate(output(m=1))), "human")

    def test_minor_is_approved(self):
        self.assertEqual(decide(parse_gate(output(n=1, t=4))), "approve")

    def test_nit_only_or_clean_can_auto_merge(self):
        self.assertEqual(decide(parse_gate(output(t=2))), "auto-merge")
        self.assertEqual(decide(parse_gate(output())), "auto-merge")

    def test_missing_gate_needs_human(self):
        self.assertEqual(decide(None), "human")


class FakeGh:
    """gh 호출 인자와 stdin JSON을 기록한다. fail_on이 인자에 들어 있는 호출만 실패한다."""

    def __init__(self, fail_on=None):
        self.calls = []
        self.fail_on = fail_on

    def __call__(self, args, stdin=None):
        self.calls.append((args, json.loads(stdin) if stdin else None))
        return not (self.fail_on and self.fail_on in " ".join(args))

    def reviews(self):
        return [payload["event"] for args, payload in self.calls if args[-3].endswith("/reviews")]

    def joined(self):
        return [" ".join(args) for args, _ in self.calls]


class ApplyGateTest(unittest.TestCase):
    def apply(self, text, auto_merge="", fail_on=None):
        gh = FakeGh(fail_on)
        code = apply_gate(text, repo="o/r", pr="6", head_sha="abc123", gh=gh, auto_merge=auto_merge)
        return code, gh

    def test_human_requests_changes_labels_and_fails_check(self):
        code, gh = self.apply(output(c=1))
        self.assertEqual(code, 1)
        self.assertEqual(gh.reviews(), ["REQUEST_CHANGES"])
        self.assertTrue(any("repos/o/r/issues/6/labels" in call and "DELETE" not in call for call in gh.joined()))

    def test_review_is_pinned_to_head_commit(self):
        _, gh = self.apply(output(n=1))
        payload = next(payload for args, payload in gh.calls if args[-3].endswith("/reviews"))
        self.assertEqual(payload["commit_id"], "abc123")

    def test_minor_approves_and_removes_label(self):
        code, gh = self.apply(output(n=1))
        self.assertEqual(code, 0)
        self.assertEqual(gh.reviews(), ["APPROVE"])
        self.assertTrue(any("DELETE" in call and "labels/needs-human-review" in call for call in gh.joined()))
        self.assertFalse(any("merge" in call for call in gh.joined()))

    def test_nit_only_approves_without_merge_while_auto_merge_is_off(self):
        code, gh = self.apply(output(t=1))
        self.assertEqual(code, 0)
        self.assertEqual(gh.reviews(), ["APPROVE"])
        self.assertFalse(any("merge" in call for call in gh.joined()))

    def test_nit_only_schedules_auto_merge_when_turned_on(self):
        _, gh = self.apply(output(t=1), auto_merge="on")
        self.assertIn("pr merge 6 --auto --rebase", " | ".join(gh.joined()))

    def test_fails_check_when_approval_is_rejected(self):
        code, _ = self.apply(output(n=1), fail_on="/reviews")
        self.assertEqual(code, 1)

    def test_fails_check_when_auto_merge_cannot_be_scheduled(self):
        code, _ = self.apply(output(t=1), auto_merge="on", fail_on="pr merge")
        self.assertEqual(code, 1)

    def test_auto_merge_switch_does_not_merge_minor(self):
        _, gh = self.apply(output(n=1), auto_merge="on")
        self.assertFalse(any("merge" in call for call in gh.joined()))


if __name__ == "__main__":
    unittest.main()
