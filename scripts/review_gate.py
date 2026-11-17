"""
review-code 3단계 게이트. /review-code 출력의 GATE 줄만 보고 PR을 처리한다.

    python3 scripts/review_gate.py <claude 출력 파일>

환경 변수: GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, REVIEW_AUTO_MERGE(레포 변수, "on"일 때만 자동 머지), GH_TOKEN

- 🔴🟠 ≥ 1 또는 GATE 줄 없음 → 봇이 Request changes + needs-human-review 라벨, exit 1(체크 실패)
- 🟡 ≥ 1 → 봇이 Approve, 라벨 제거
- ⚪만 또는 0건 → Approve, REVIEW_AUTO_MERGE=on이면 자동 머지 예약(레포 Allow auto-merge와 contents: write 필요)

봇 리뷰는 마지막 것이 앞의 것을 덮으므로, 승인 뒤 🔴 커밋이 오면 Request changes로 바뀐다.
"""

import json
import os
import re
import sys
from pathlib import Path

from review_action import run_gh

GATE_RE = re.compile(r"^GATE: critical=(\d+) major=(\d+) minor=(\d+) nit=(\d+)$", re.M)
LABEL = "needs-human-review"


def parse_gate(text):
    gates = GATE_RE.findall(text)
    if not gates:
        return None
    critical, major, minor, nit = map(int, gates[-1])
    return {"critical": critical, "major": major, "minor": minor, "nit": nit}


def decide(counts):
    if counts is None or counts["critical"] or counts["major"]:
        return "human"
    if counts["minor"]:
        return "approve"
    return "auto-merge"


def apply_gate(text, repo, pr, head_sha, gh, auto_merge):
    counts = parse_gate(text)
    decision = decide(counts)
    gate_line = "GATE 줄 없음" if counts is None else " ".join(f"{k}={v}" for k, v in counts.items())

    def review(event, body):
        gh(["api", "--method", "POST", f"repos/{repo}/pulls/{pr}/reviews", "--input", "-"],
           stdin=json.dumps({"commit_id": head_sha, "event": event, "body": body}))

    if decision == "human":
        review("REQUEST_CHANGES", f"review-code 게이트: 🔴🟠가 있거나 결과를 읽지 못해 사람 리뷰가 필요해요. ({gate_line})")
        gh(["api", "--method", "POST", f"repos/{repo}/issues/{pr}/labels", "--input", "-"],
           stdin=json.dumps({"labels": [LABEL]}))
        return 1

    review("APPROVE", f"review-code 게이트: 🟡 이하라 자동 승인해요. ({gate_line})")
    gh(["api", "--method", "DELETE", f"repos/{repo}/issues/{pr}/labels/{LABEL}"])  # 없으면 404, 무시한다
    if decision == "auto-merge" and auto_merge == "on":
        gh(["pr", "merge", pr, "--auto", "--rebase"])
    return 0


def main():
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    return apply_gate(text, repo=os.environ["GITHUB_REPOSITORY"], pr=os.environ["PR_NUMBER"],
                      head_sha=os.environ["HEAD_SHA"], gh=run_gh,
                      auto_merge=os.environ.get("REVIEW_AUTO_MERGE", ""))


if __name__ == "__main__":
    sys.exit(main())
