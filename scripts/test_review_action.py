"""
scripts/review_action.py 테스트. GitHub Action이 /review-code 출력을 PR 리뷰로 올리는 부분이다.

    python -m unittest scripts/test_review_action.py
"""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from review_action import parse_output, publish, review_payload  # noqa: E402

COMMENT_BODY = "[🔴 critical] 결제 리다이렉트로 Pro 승격\\nTL;DR: ..."

OUTPUT = f"""\
리뷰를 시작합니다.

## review-code 요약
판정: Blocked

| 🔴 critical | 🟠 major | 🟡 minor | ⚪ nit |
|---|---|---|---|
| 1 | 0 | 0 | 0 |

### 🔴🟠 지적
- [🔴 critical] src/app/dashboard/page.tsx:32 결제 리다이렉트로 Pro 승격

GATE: critical=1 major=0 minor=0 nit=0

### src/app/dashboard/page.tsx:32
[🔴 critical] 결제 리다이렉트로 Pro 승격

```json
{{
  "verdict": "Blocked",
  "counts": {{"critical": 1, "major": 0, "minor": 0, "nit": 0}},
  "comments": [
    {{"path": "src/app/dashboard/page.tsx", "line": 32, "severity": "critical", "body": "{COMMENT_BODY}"}}
  ]
}}
```
"""


class ParseOutputTest(unittest.TestCase):
    def test_summary_runs_from_heading_to_gate_line(self):
        summary, _ = parse_output(OUTPUT)
        self.assertTrue(summary.startswith("## review-code 요약"))
        self.assertTrue(summary.endswith("GATE: critical=1 major=0 minor=0 nit=0"))
        self.assertNotIn("```json", summary)

    def test_reads_comments_from_last_json_block(self):
        earlier = "```json\n{\"comments\": []}\n```\n"
        _, result = parse_output(earlier + OUTPUT)
        self.assertEqual(result["comments"][0]["line"], 32)

    def test_rejects_output_without_gate_line(self):
        with self.assertRaises(ValueError):
            parse_output(OUTPUT.replace("GATE:", "gate:"))

    def test_rejects_output_without_json_block(self):
        with self.assertRaises(ValueError):
            parse_output(OUTPUT.split("```json")[0])


class ReviewPayloadTest(unittest.TestCase):
    def setUp(self):
        self.summary, self.result = parse_output(OUTPUT)

    def test_inline_payload_comments_on_new_side_of_head_commit(self):
        payload = review_payload(self.summary, self.result, "abc123", inline=True)
        self.assertEqual(payload["commit_id"], "abc123")
        self.assertEqual(payload["event"], "COMMENT")
        self.assertEqual(payload["body"], self.summary)
        self.assertEqual(payload["comments"], [{
            "path": "src/app/dashboard/page.tsx", "line": 32, "side": "RIGHT",
            "body": self.result["comments"][0]["body"],
        }])

    def test_fallback_payload_moves_comments_into_body(self):
        payload = review_payload(self.summary, self.result, "abc123", inline=False)
        self.assertEqual(payload["comments"], [])
        self.assertIn("### src/app/dashboard/page.tsx:32", payload["body"])
        self.assertIn(self.result["comments"][0]["body"], payload["body"])


class FakeGh:
    """gh 호출을 기록한다. results 순서대로 성공 여부를 돌려준다."""

    def __init__(self, *results):
        self.results = list(results)
        self.calls = []

    def __call__(self, args, stdin=None):
        self.calls.append((args, json.loads(stdin) if stdin else None))
        return self.results.pop(0)


class PublishTest(unittest.TestCase):
    def publish(self, output, gh):
        return publish(output, repo="o/r", pr="4", head_sha="abc123", gh=gh)

    def test_posts_review_with_inline_comments(self):
        gh = FakeGh(True)
        self.assertEqual(self.publish(OUTPUT, gh), 0)
        args, payload = gh.calls[0]
        self.assertIn("repos/o/r/pulls/4/reviews", args)
        self.assertEqual(len(payload["comments"]), 1)

    def test_retries_without_inline_comments_when_github_rejects_a_line(self):
        gh = FakeGh(False, True)
        self.assertEqual(self.publish(OUTPUT, gh), 0)
        self.assertEqual(len(gh.calls), 2)
        self.assertEqual(gh.calls[1][1]["comments"], [])

    def test_reports_failure_on_pr_when_output_is_unreadable(self):
        gh = FakeGh(True)
        self.assertEqual(self.publish("API error", gh), 1)
        args, payload = gh.calls[0]
        self.assertIn("repos/o/r/issues/4/comments", args)
        self.assertIn("리뷰 결과를 읽지 못했어요", payload["body"])


if __name__ == "__main__":
    unittest.main()
