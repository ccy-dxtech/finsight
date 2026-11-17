"""
GitHub Action에서 /review-code 출력을 PR 리뷰 하나로 올린다.

    python3 scripts/review_action.py <claude 출력 파일>

환경 변수: GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, GH_TOKEN(gh가 읽는다)

- PR 요약(## review-code 요약 ~ GATE 줄)은 리뷰 본문, 기계용 JSON의 comments는 인라인 코멘트로 올린다.
- GitHub가 인라인 줄을 거부하면(diff 밖 줄 등) 리뷰 전체가 실패하므로, 코멘트를 본문으로 옮겨 한 번 더 올린다.
- 출력을 읽지 못하면 PR에 실패 코멘트를 남기고 exit 1로 Action을 실패시킨다.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

GATE_RE = re.compile(r"^GATE: critical=\d+ major=\d+ minor=\d+ nit=\d+$", re.M)
JSON_BLOCK_RE = re.compile(r"^```json[ \t]*\n(.*?)\n```", re.M | re.S)
SUMMARY_HEADING = "## review-code 요약"


def parse_output(text):
    """(PR 요약, 기계용 JSON)을 돌려준다. 둘 중 하나라도 없으면 ValueError."""
    gates = list(GATE_RE.finditer(text))
    if not gates:
        raise ValueError("GATE 줄이 없음")
    gate = gates[-1]
    start = text.rfind(SUMMARY_HEADING, 0, gate.start())
    summary = text[max(start, 0):gate.end()].strip()

    blocks = JSON_BLOCK_RE.findall(text)
    if not blocks:
        raise ValueError("기계용 JSON 블록이 없음")
    return summary, json.loads(blocks[-1])


def review_payload(summary, result, head_sha, inline):
    comments = result.get("comments", [])
    if inline:
        body = summary
        inline_comments = [
            {"path": c["path"], "line": c["line"], "side": "RIGHT", "body": c["body"]} for c in comments
        ]
    else:
        body = "\n\n".join([summary] + [f"### {c['path']}:{c['line']}\n{c['body']}" for c in comments])
        inline_comments = []
    return {"commit_id": head_sha, "event": "COMMENT", "body": body, "comments": inline_comments}


def publish(text, repo, pr, head_sha, gh):
    try:
        summary, result = parse_output(text)
    except ValueError as error:
        body = f"review-code: 리뷰 결과를 읽지 못했어요({error}). Action 로그를 확인하세요."
        gh(["api", "--method", "POST", f"repos/{repo}/issues/{pr}/comments", "--input", "-"],
           stdin=json.dumps({"body": body}))
        return 1

    for inline in (True, False):
        payload = review_payload(summary, result, head_sha, inline)
        if gh(["api", "--method", "POST", f"repos/{repo}/pulls/{pr}/reviews", "--input", "-"],
              stdin=json.dumps(payload)):
            return 0
    return 1


def run_gh(args, stdin=None):
    result = subprocess.run(["gh", *args], input=stdin, text=True, encoding="utf-8", capture_output=True)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
    return result.returncode == 0


def main():
    text = Path(sys.argv[1]).read_text(encoding="utf-8")
    return publish(text, repo=os.environ["GITHUB_REPOSITORY"], pr=os.environ["PR_NUMBER"],
                   head_sha=os.environ["HEAD_SHA"], gh=run_gh)


if __name__ == "__main__":
    sys.exit(main())
