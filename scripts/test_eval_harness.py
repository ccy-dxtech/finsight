"""
scripts/eval_harness.py 테스트. 하네스 Eval 러너의 순수 로직(케이스 로드, GATE 검사, 최종 판정, 보고)을 본다.

    python -m unittest scripts/test_eval_harness.py
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from eval_harness import (  # noqa: E402
    check_gate,
    exit_code,
    final_verdict,
    judge_case,
    load_cases,
    parse_claude_json,
    render_report,
)


def gate(c=0, m=0, n=0, t=0):
    return {"critical": c, "major": m, "minor": n, "nit": t}


class LoadCasesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        for cid in ["02-b", "01-a", "03-c"]:
            (self.dir / f"{cid}.json").write_text(json.dumps({"id": cid, "prompt": "/x", "expect": "y"}), encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_loads_all_cases_in_file_order(self):
        self.assertEqual([c["id"] for c in load_cases(self.dir)], ["01-a", "02-b", "03-c"])

    def test_only_filters_by_id(self):
        self.assertEqual([c["id"] for c in load_cases(self.dir, only=["03-c", "01-a"])], ["01-a", "03-c"])

    def test_unknown_only_id_is_an_error(self):
        with self.assertRaises(SystemExit):
            load_cases(self.dir, only=["99-none"])


class CheckGateTest(unittest.TestCase):
    def test_no_spec_means_no_gate(self):
        self.assertIsNone(check_gate(None, gate()))

    def test_missing_gate_line_fails(self):
        self.assertFalse(check_gate({"critical": ">=1"}, None))

    def test_at_least(self):
        self.assertTrue(check_gate({"critical": ">=1"}, gate(c=2)))
        self.assertFalse(check_gate({"critical": ">=1"}, gate(m=3)))

    def test_exact_zero_on_every_key(self):
        self.assertTrue(check_gate({"critical": "0", "major": "0"}, gate(n=2, t=1)))
        self.assertFalse(check_gate({"critical": "0", "major": "0"}, gate(m=1)))

    def test_sum_of_keys(self):
        self.assertTrue(check_gate({"critical+major": ">=1"}, gate(m=1)))
        self.assertFalse(check_gate({"critical+major": ">=1"}, gate(n=4)))


class FinalVerdictTest(unittest.TestCase):
    def test_gate_and_judge_agree(self):
        self.assertEqual(final_verdict(True, "pass"), "pass")
        self.assertEqual(final_verdict(False, "fail"), "fail")

    def test_judge_alone_when_no_gate(self):
        self.assertEqual(final_verdict(None, "pass"), "pass")
        self.assertEqual(final_verdict(None, "fail"), "fail")

    def test_unsure_or_disagreement_goes_to_human(self):
        self.assertEqual(final_verdict(True, "unsure"), "review")
        self.assertEqual(final_verdict(True, "fail"), "review")
        self.assertEqual(final_verdict(False, "pass"), "review")

    def test_judge_error_goes_to_human(self):
        self.assertEqual(final_verdict(True, None), "review")


class ParseClaudeJsonTest(unittest.TestCase):
    def test_reads_result_cost_and_structured_output(self):
        stdout = json.dumps({"result": "GATE: ...", "total_cost_usd": 0.12, "duration_ms": 3400,
                             "is_error": False, "structured_output": {"verdict": "pass", "reason": "ok"}})
        out = parse_claude_json(stdout)
        self.assertEqual(out["result"], "GATE: ...")
        self.assertEqual(out["cost_usd"], 0.12)
        self.assertEqual(out["duration_ms"], 3400)
        self.assertEqual(out["structured"], {"verdict": "pass", "reason": "ok"})
        self.assertFalse(out["error"])

    def test_non_json_stdout_is_an_error_with_raw_text(self):
        out = parse_claude_json("API Error: 529")
        self.assertTrue(out["error"])
        self.assertEqual(out["result"], "API Error: 529")


class JudgeCaseTest(unittest.TestCase):
    def test_passes_rubric_and_output_to_judge_and_reads_verdict(self):
        seen = {}

        def fake_claude(prompt, **kwargs):
            seen["prompt"] = prompt
            seen["kwargs"] = kwargs
            return {"result": "", "structured": {"verdict": "fail", "reason": "RLS 지적 없음"},
                    "cost_usd": 0.01, "duration_ms": 10, "error": False}

        judge = judge_case({"expect": "RLS 누락을 critical로"}, "리뷰 출력 본문", run_claude=fake_claude)
        self.assertEqual(judge, {"verdict": "fail", "reason": "RLS 지적 없음", "cost_usd": 0.01})
        self.assertIn("RLS 누락을 critical로", seen["prompt"])
        self.assertIn("리뷰 출력 본문", seen["prompt"])
        self.assertEqual(seen["kwargs"]["model"], "opus")

    def test_judge_failure_returns_none_verdict(self):
        def broken(prompt, **kwargs):
            return {"result": "boom", "structured": None, "cost_usd": 0, "duration_ms": 0, "error": True}

        self.assertIsNone(judge_case({"expect": "x"}, "out", run_claude=broken)["verdict"])


class ExitCodeTest(unittest.TestCase):
    def test_all_pass_is_zero(self):
        self.assertEqual(exit_code(["pass", "pass"]), 0)

    def test_any_fail_is_one(self):
        self.assertEqual(exit_code(["pass", "review", "fail"]), 1)

    def test_review_only_is_two(self):
        self.assertEqual(exit_code(["pass", "review"]), 2)


class RenderReportTest(unittest.TestCase):
    def test_table_has_one_row_per_case_and_lists_human_review(self):
        rows = [
            {"id": "01-a", "gate": gate(c=1), "gate_ok": True, "judge": {"verdict": "pass", "reason": "잡음"},
             "verdict": "pass", "cost_usd": 0.5, "duration_s": 40},
            {"id": "04-b", "gate": gate(m=1), "gate_ok": False, "judge": {"verdict": "pass", "reason": "정당한 지적"},
             "verdict": "review", "cost_usd": 0.4, "duration_s": 35},
        ]
        report = render_report(rows)
        self.assertIn("| 01-a |", report)
        self.assertIn("| 04-b |", report)
        self.assertIn("critical=1 major=0 minor=0 nit=0", report)
        self.assertIn("사람 검토", report)
        self.assertIn("정당한 지적", report)
        self.assertIn("pass 1 · fail 0 · review 1", report)


if __name__ == "__main__":
    unittest.main()
