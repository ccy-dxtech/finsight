"""
scripts/perf_loop.py 테스트. Lighthouse 결과에서 지표를 뽑고, 게이트와 멈춤 조건을 판정한다.

    python -m unittest scripts/test_perf_loop.py
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from perf_loop import (  # noqa: E402
    check_gate,
    extract_metrics,
    failing_audits,
    median_metrics,
    render_section,
    stop_reason,
)


def report(score=0.98, lcp=910.4, tbt=55, cls=0.0094, total=438167, script=143651, font=265088,
           blocking=1, legacy=13909):
    """Lighthouse 13 JSON에서 러너가 읽는 부분만 남긴 최소 보고서."""
    return {
        "categories": {"performance": {"score": score}},
        "audits": {
            "largest-contentful-paint": {"numericValue": lcp},
            "total-blocking-time": {"numericValue": tbt},
            "cumulative-layout-shift": {"numericValue": cls},
            "resource-summary": {"details": {"items": [
                {"resourceType": "total", "transferSize": total},
                {"resourceType": "script", "transferSize": script},
                {"resourceType": "font", "transferSize": font},
            ]}},
            "render-blocking-insight": {"score": 0 if blocking else 1, "details": {"items": [
                {"url": f"http://localhost:3100/a{i}.css", "wastedMs": 305} for i in range(blocking)
            ]}},
            "legacy-javascript-insight": {"score": 0.5 if legacy else 1, "displayValue": "Est savings of 14 KiB",
                                          "details": {"items": [{"url": "a.js", "wastedBytes": legacy}] if legacy else []}},
            "unused-javascript": {"score": 0.5, "scoreDisplayMode": "metricSavings", "title": "Reduce unused JavaScript",
                                  "displayValue": "Est savings of 51 KiB",
                                  "details": {"items": [{"url": "http://localhost:3100/c.js", "wastedBytes": 29947}]}},
            "font-display-insight": {"score": 1, "scoreDisplayMode": "metricSavings", "title": "Font display"},
            "max-potential-fid": {"score": 0.95, "scoreDisplayMode": "numeric", "title": "Max Potential FID"},
            "diagnostics": {"score": None, "scoreDisplayMode": "informative"},
        },
    }


GATE = {
    "/": {"render_blocking": 0, "legacy_js_bytes": 0, "script_bytes": 143651},
    "/login": {"script_bytes": 160000},
}


class ExtractMetricsTest(unittest.TestCase):
    def test_reads_scores_timings_and_bytes(self):
        self.assertEqual(extract_metrics(report()), {
            "score": 98, "lcp_ms": 910, "tbt_ms": 55, "cls": 0.009,
            "total_bytes": 438167, "script_bytes": 143651, "font_bytes": 265088,
            "render_blocking": 1, "legacy_js_bytes": 13909,
        })

    def test_missing_resource_type_and_details_count_as_zero(self):
        data = report(blocking=0, legacy=0)
        data["audits"]["resource-summary"]["details"]["items"].pop(2)  # 폰트 없음
        del data["audits"]["render-blocking-insight"]["details"]
        metrics = extract_metrics(data)
        self.assertEqual((metrics["font_bytes"], metrics["render_blocking"], metrics["legacy_js_bytes"]), (0, 0, 0))


class MedianMetricsTest(unittest.TestCase):
    def test_takes_median_of_each_metric(self):
        runs = [extract_metrics(report(score=s, tbt=t)) for s, t in [(0.9, 80), (1, 55), (0.95, 62)]]
        median = median_metrics(runs)
        self.assertEqual((median["score"], median["tbt_ms"], median["script_bytes"]), (95, 62, 143651))


class CheckGateTest(unittest.TestCase):
    def test_lists_every_metric_over_its_limit(self):
        pages = {"/": extract_metrics(report()), "/login": extract_metrics(report(script=212319))}
        self.assertEqual(check_gate(pages, GATE), [
            "/ render_blocking 1 > 0",
            "/ legacy_js_bytes 13909 > 0",
            "/login script_bytes 212319 > 160000",
        ])

    def test_passes_when_all_limits_hold(self):
        pages = {"/": extract_metrics(report(blocking=0, legacy=0)), "/login": extract_metrics(report(script=150000))}
        self.assertEqual(check_gate(pages, GATE), [])

    def test_unmeasured_page_fails(self):
        self.assertEqual(check_gate({"/": extract_metrics(report(blocking=0, legacy=0))}, GATE), ["/login 측정 결과 없음"])


class StopReasonTest(unittest.TestCase):
    before = {"/": {"render_blocking": 1, "script_bytes": 143651}}

    def test_gate_pass_stops_first(self):
        self.assertEqual(stop_reason(3, 3, [], self.before, self.before, changed=False), "gate_passed")

    def test_no_diff_is_stagnation(self):
        self.assertEqual(stop_reason(1, 3, ["x"], self.before, self.before, changed=False), "no_diff")

    def test_no_gated_metric_improved_is_stagnation(self):
        after = {"/": {"render_blocking": 1, "script_bytes": 150000}}
        self.assertEqual(stop_reason(1, 3, ["x"], self.before, after, changed=True), "stalled")

    def test_max_iteration_stops_even_when_improving(self):
        after = {"/": {"render_blocking": 0, "script_bytes": 143651}}
        self.assertIsNone(stop_reason(2, 3, ["x"], self.before, after, changed=True))
        self.assertEqual(stop_reason(3, 3, ["x"], self.before, after, changed=True), "max_iter")


class FailingAuditsTest(unittest.TestCase):
    def test_lists_audits_below_full_score_with_top_items(self):
        text = failing_audits(report())
        self.assertIn("unused-javascript (0.5) Est savings of 51 KiB", text)
        self.assertIn("http://localhost:3100/c.js", text)
        self.assertIn("render-blocking-insight", text)
        self.assertNotIn("font-display-insight", text)
        self.assertNotIn("diagnostics", text)


class RenderSectionTest(unittest.TestCase):
    def test_renders_before_after_table_and_stop_reason(self):
        before = {"/": extract_metrics(report())}
        after = {"/": extract_metrics(report(blocking=0, script=140000))}
        rows = [
            {"iter": 0, "pages": before, "status": "기준선", "failures": ["/ render_blocking 1 > 0"]},
            {"iter": 1, "pages": after, "status": "적용", "failures": []},
        ]
        text = render_section("2026-11-21 09:30", rows, "gate_passed")
        self.assertIn("## 2026-11-21 09:30 실행", text)
        self.assertIn("| 0 | / | 기준선 | 98 | 910 | 55 | 0.009 | 438,167 | 143,651 | 265,088 | 1 | 13,909 |", text)
        self.assertIn("| 1 | / | 적용 | 98 | 910 | 55 | 0.009 | 438,167 | 140,000 | 265,088 | 0 | 13,909 |", text)
        self.assertIn("게이트 미달: / render_blocking 1 > 0", text)
        self.assertIn("멈춤: gate_passed", text)


if __name__ == "__main__":
    unittest.main()
