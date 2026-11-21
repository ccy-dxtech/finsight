#!/usr/bin/env python3
"""
Lighthouse 성능 개선 루프 — 측정 → 분석 → 개선 → 재측정을 게이트 통과나 MAX 바퀴까지 스스로 반복한다.

    python scripts/perf_loop.py

- 측정·게이트·검사·되돌리기·커밋은 이 스크립트가, 분석·적용은 `claude -p`가 맡는다.
- 게이트는 perf/gate.json. 바이트·항목 수처럼 실행마다 같은 값만 게이트로 쓴다.
  점수·LCP·TBT·CLS는 실행마다 출렁이므로 3회 중앙값을 기록만 한다.
- 되돌리기에 `git reset --hard`·`git clean -fd`를 쓰므로 깨끗한 작업 트리의 main이 아닌 브랜치에서만 돈다.
  (docs/OPERATIONS.md "성능 루프")
"""

import json
import os
import shutil
import statistics
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GATE_FILE = ROOT / "perf" / "gate.json"
LOG_DOC = ROOT / "docs" / "perf" / "lighthouse-loop.md"
LOG_DOC_REL = "docs/perf/lighthouse-loop.md"
RUNS_DIR = ROOT / ".perf" / "runs"
PORT = 3100  # 3000은 OAuth 기준 포트라 개발 서버용으로 비워 둔다.
KST = timezone(timedelta(hours=9))
DOC_HEADER = """# Lighthouse 성능 루프 기록

`scripts/perf_loop.py`가 바퀴마다 남긴 전/후 숫자다. 로컬 프로덕션 빌드(`next start -p 3100`)를 모바일로 페이지마다 3회 쟀다.
게이트는 `perf/gate.json`의 바이트·항목 수(실행마다 같은 값)다. 점수·LCP·TBT·CLS는 출렁이므로 3회 중앙값을 참고로만 적는다.
"""
COLUMNS = ["score", "lcp_ms", "tbt_ms", "cls", "total_bytes", "script_bytes", "font_bytes",
           "render_blocking", "legacy_js_bytes"]


# ---------- 순수 함수 (scripts/test_perf_loop.py) ----------

def extract_metrics(report: dict) -> dict:
    audits = report["audits"]
    sizes = {item["resourceType"]: item["transferSize"]
             for item in audits["resource-summary"]["details"]["items"]}

    def items(audit_id):
        return (audits.get(audit_id, {}).get("details") or {}).get("items") or []

    return {
        "score": round(report["categories"]["performance"]["score"] * 100),
        "lcp_ms": round(audits["largest-contentful-paint"]["numericValue"]),
        "tbt_ms": round(audits["total-blocking-time"]["numericValue"]),
        "cls": round(audits["cumulative-layout-shift"]["numericValue"], 3),
        "total_bytes": sizes.get("total", 0),
        "script_bytes": sizes.get("script", 0),
        "font_bytes": sizes.get("font", 0),
        "render_blocking": len(items("render-blocking-insight")),
        "legacy_js_bytes": sum(item.get("wastedBytes", 0) for item in items("legacy-javascript-insight")),
    }


def median_metrics(runs: list) -> dict:
    result = {}
    for key in runs[0]:
        value = statistics.median(run[key] for run in runs)
        result[key] = round(value, 3) if key == "cls" else round(value)
    return result


def check_gate(pages: dict, gate: dict) -> list:
    failures = []
    for page, limits in gate.items():
        if page not in pages:
            failures.append(f"{page} 측정 결과 없음")
            continue
        for key, limit in limits.items():
            if pages[page][key] > limit:
                failures.append(f"{page} {key} {pages[page][key]} > {limit}")
    return failures


def stop_reason(iteration, max_iter, failures, before, after, changed):
    """before·after에는 게이트 지표만 넣는다. 멈추지 않으면 None."""
    if not failures:
        return "gate_passed"
    if not changed:
        return "no_diff"
    improved = any(after.get(page, {}).get(key, value) < value
                   for page, metrics in before.items() for key, value in metrics.items())
    if not improved:
        return "stalled"
    if iteration >= max_iter:
        return "max_iter"
    return None


def failing_audits(report: dict, top: int = 3) -> str:
    lines = []
    for audit_id, audit in report["audits"].items():
        score = audit.get("score")
        if not isinstance(score, (int, float)) or score >= 1:
            continue
        lines.append(f"- {audit_id} ({score:g}) {audit.get('displayValue', '')}".rstrip())
        for item in ((audit.get("details") or {}).get("items") or [])[:top]:
            if isinstance(item, dict) and "url" in item:
                extra = ", ".join(f"{k}={item[k]:.0f}" for k in ("wastedBytes", "wastedMs", "totalBytes")
                                  if isinstance(item.get(k), (int, float)))
                lines.append(f"  - {item['url']} {extra}".rstrip())
    return "\n".join(lines)


def _cell(key, value):
    if key == "cls":
        return f"{value:.3f}"
    return f"{value:,}" if key.endswith("_bytes") else str(value)


def render_section(started: str, rows: list, reason) -> str:
    header = ["바퀴", "페이지", "상태", "점수", "LCP ms", "TBT ms", "CLS", "총 바이트", "JS 바이트",
              "폰트 바이트", "render-blocking", "레거시 JS"]
    lines = [f"## {started} 실행", "", "| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    notes = []
    for row in rows:
        pages = row["pages"] or {"-": None}
        for page, metrics in pages.items():
            cells = [_cell(k, metrics[k]) for k in COLUMNS] if metrics else ["-"] * len(COLUMNS)
            lines.append("| " + " | ".join([str(row["iter"]), page, row["status"], *cells]) + " |")
        if row.get("failures"):
            notes.append(f"- 바퀴 {row['iter']} 게이트 미달: " + ", ".join(row["failures"]))
        if row.get("note"):
            notes.append(f"- 바퀴 {row['iter']}: {row['note']}")
    lines += ["", *notes, "", f"멈춤: {reason or '(진행 중)'}", ""]
    return "\n".join(lines)


# ---------- 실행 ----------

NPM = shutil.which("npm") or "npm"
NPX = shutil.which("npx") or "npx"
CLAUDE = shutil.which("claude") or "claude"


def log(message):
    print(f"[perf-loop {datetime.now(KST):%H:%M:%S}] {message}", flush=True)


def run(args, timeout=1800, input_text=None):
    """시간 초과도 실패(124)로 돌려줘, 루프가 되돌림·기록 없이 죽지 않게 한다."""
    try:
        return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=timeout, input=input_text)
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(args, 124, "", f"timeout {timeout}s")


def git(*args):
    return run(["git", *args]).stdout.strip()


def changed_paths():
    lines = run(["git", "status", "--porcelain", "--untracked-files=all"]).stdout.splitlines()
    return [line[3:].strip().strip('"') for line in lines if line[3:].strip().strip('"') != LOG_DOC_REL]


def fetch(url):
    with urllib.request.urlopen(url, timeout=10) as response:
        return response.status, response.read().decode("utf-8", "replace")


def page_slug(page):
    return page.strip("/").replace("/", "-") or "home"


def stop_server(proc):
    if os.name == "nt":
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True)
    else:
        proc.terminate()
    proc.wait(timeout=30)


def measure(config, out_dir: Path):
    """빌드 → 서버 → 스모크 → lighthouse. (페이지별 중앙값, 대표 보고서, 문제 목록)을 돌려준다."""
    out_dir.mkdir(parents=True, exist_ok=True)
    build = run([NPM, "run", "build"])
    (out_dir / "build.log").write_text(build.stdout + build.stderr, encoding="utf-8")
    if build.returncode != 0:
        return {}, {}, ["npm run build 실패"]

    base = f"http://localhost:{PORT}"
    try:
        fetch(base)
        return {}, {}, [f"{PORT}번 포트에 이미 서버가 있다. 끄고 다시 실행"]
    except OSError:
        pass
    server = subprocess.Popen([NPX, "next", "start", "-p", str(PORT)], cwd=ROOT,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    problems, pages, reports = [], {}, {}
    try:
        for _ in range(60):
            try:
                fetch(base)
                break
            except OSError:
                time.sleep(1)
        for page, text in config["smoke"].items():
            try:
                status, body = fetch(base + page)
                if status != 200 or text not in body:
                    problems.append(f"스모크 실패: {page} {status}, '{text}' 없음")
            except OSError as error:
                problems.append(f"스모크 실패: {page} {error}")
        for page in config["pages"]:
            runs = []
            for k in range(1, config["runs_per_page"] + 1):
                path = out_dir / f"{page_slug(page)}-{k}.json"
                run([NPX, "--no-install", "lighthouse", base + page, "--output=json", f"--output-path={path}",
                     "--form-factor=mobile", "--chrome-flags=--headless=new", "--quiet"], timeout=300)
                if path.exists():
                    runs.append(extract_metrics(json.loads(path.read_text(encoding="utf-8"))))
            if runs:
                pages[page] = median_metrics(runs)
                reports[page] = out_dir / f"{page_slug(page)}-1.json"
            else:
                problems.append(f"lighthouse 실패: {page}")
    finally:
        stop_server(server)
    return pages, reports, problems


def claude(prompt, tools, out_file: Path):
    result = run([CLAUDE, "-p", "--no-session-persistence", "--max-turns", "60", "--allowedTools", *tools],
                 timeout=3600, input_text=prompt)
    out_file.write_text(result.stdout + ("\n\n--- stderr ---\n" + result.stderr if result.stderr else ""),
                        encoding="utf-8")
    return result.returncode == 0


def analysis_prompt(pages, reports, failures, history):
    audits = "\n\n".join(f"### {page}\n{failing_audits(json.loads(path.read_text(encoding='utf-8')))}"
                         for page, path in reports.items())
    files = "\n".join(f"- {page}: {path}" for page, path in reports.items())
    return f"""FinSight 공개 페이지의 모바일 Lighthouse 결과를 보고 성능 병목을 조사해 줘. 파일은 고치지 마.

## 게이트 미달 (이 항목을 없애는 것이 목표)
{chr(10).join('- ' + f for f in failures)}

## 페이지별 지표 (3회 중앙값)
{json.dumps(pages, ensure_ascii=False, indent=1)}

## 만점이 아닌 audit (첫 실행)
{audits}

## 원본 JSON (필요하면 Read·Grep으로 직접 본다)
{files}

## 지금까지의 루프 기록
{history}

할 일:
1. 임팩트 큰 병목 3개를 고르고, 각각 실제 원인이 되는 코드 지점(파일:줄, 의존성, 설정)을 찾는다.
2. 처방을 쓴다. Next.js 버전이 학습 데이터와 다르므로 `node_modules/next/dist/docs/`에서 해당 API를 확인하고 근거를 적는다.
3. 앞 바퀴에서 이미 시도한 처방은 반복하지 않는다.

제약: AGENTS.md 규칙(화면 모양·문구 그대로, 색·글자 크기는 @theme 토큰, 서버 전용 코드 경계)을 지킨다.
perf/gate.json, scripts/perf_loop.py, docs/perf/는 대상이 아니다.

출력 형식(마크다운):
## 병목 1 — <제목>
- 근거: <audit id와 숫자>
- 코드 지점: <파일:줄>
- 처방: <구체적 변경>
- 동작 위험: <깨질 수 있는 것과 확인 방법>
(병목 2, 3 같은 형식)
"""


def apply_prompt(findings_path: Path):
    return f"""{findings_path} 에 있는 성능 처방을 이 저장소에 적용해 줘.

- 게이트 미달 항목을 없애는 처방부터 적용한다. 처방 범위 밖은 고치지 않는다.
- 화면 모양·문구·동작은 그대로 둔다(AGENTS.md). 컴포넌트 동작을 바꾸면 테스트를 먼저 고치거나 추가한다(TDD).
- perf/gate.json, scripts/perf_loop.py, docs/perf/는 고치지 않는다. 커밋하지 않는다.
- 끝나기 전에 `npm run lint`와 `npm run test`를 돌려 통과시킨다.
- 마지막에 바꾼 파일과 이유를 세 줄 이내로 요약한다.
"""


def write_doc(prefix, started, rows, reason):
    LOG_DOC.parent.mkdir(parents=True, exist_ok=True)
    LOG_DOC.write_text(prefix + "\n" + render_section(started, rows, reason), encoding="utf-8")


def revert(sha):
    run(["git", "reset", "--hard", sha])
    run(["git", "clean", "-fd"])


def gated(pages, gate):
    return {page: {key: pages[page][key] for key in limits} for page, limits in gate.items() if page in pages}


def main():
    config = json.loads(GATE_FILE.read_text(encoding="utf-8"))
    gate, max_iter = config["pages"], config["max_iter"]
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch in ("main", "HEAD") or run(["git", "status", "--porcelain"]).stdout.strip():
        sys.exit(f"작업 트리가 깨끗한 main 밖의 브랜치에서 실행한다(지금 {branch}). git status를 확인.")

    now = datetime.now(KST)
    started, run_dir = f"{now:%Y-%m-%d %H:%M}", RUNS_DIR / f"{now:%Y%m%d-%H%M%S}"
    prefix = LOG_DOC.read_text(encoding="utf-8") if LOG_DOC.exists() else DOC_HEADER
    rows, reason = [], None

    log("기준선 측정")
    pages, reports, problems = measure(config, run_dir / "iter-0")
    if problems:
        sys.exit("기준선 측정 실패: " + "; ".join(problems))
    failures = check_gate(pages, gate)
    rows.append({"iter": 0, "pages": pages, "status": "기준선", "failures": failures})
    write_doc(prefix, started, rows, None)
    log(f"기준선 게이트 미달 {len(failures)}건: {failures}")
    if not failures:
        reason = "gate_passed"

    iteration = 0
    while reason is None:
        iteration += 1
        iter_dir = run_dir / f"iter-{iteration}"
        iter_dir.mkdir(parents=True, exist_ok=True)
        start_sha = git("rev-parse", "HEAD")

        log(f"바퀴 {iteration}: 분석")
        findings = iter_dir / "findings.md"
        history = render_section(started, rows, None)
        claude(analysis_prompt(pages, reports, failures, history), ["Read", "Grep", "Glob"], findings)

        log(f"바퀴 {iteration}: 적용")
        claude(apply_prompt(findings), ["Read", "Grep", "Glob", "Edit", "Write",
                                        "Bash(npm run test:*)", "Bash(npm run lint:*)", "Bash(npx vitest:*)"],
               iter_dir / "apply.md")
        changed = bool(changed_paths())

        problems = []
        if changed:
            log(f"바퀴 {iteration}: 검사(lint·test) + 재측정")
            for script in ("lint", "test"):
                result = run([NPM, "run", script])
                (iter_dir / f"{script}.log").write_text(result.stdout + result.stderr, encoding="utf-8")
                if result.returncode != 0:
                    problems.append(f"npm run {script} 실패")
            after, after_reports, measure_problems = measure(config, iter_dir) if not problems else ({}, {}, [])
            problems += measure_problems

        if not changed:
            reason = "no_diff"
            rows.append({"iter": iteration, "pages": {}, "status": "변경 없음", "failures": failures})
        elif problems:
            revert(start_sha)
            rows.append({"iter": iteration, "pages": {}, "status": "되돌림", "note": "; ".join(problems)})
            log(f"바퀴 {iteration}: 동작 깨짐으로 되돌림 — {problems}")
            reason = "max_iter" if iteration >= max_iter else None
        else:
            after_failures = check_gate(after, gate)
            reason = stop_reason(iteration, max_iter, after_failures, gated(pages, gate), gated(after, gate), True)
            rows.append({"iter": iteration, "pages": after, "status": "적용", "failures": after_failures})
            write_doc(prefix, started, rows, reason)
            run(["git", "add", "-A"])
            commit = run(["git", "commit", "-m", f"perf: 성능 루프 바퀴 {iteration} — 게이트 미달 "
                                                 f"{len(failures)}→{len(after_failures)}건"])
            if commit.returncode != 0:  # pre-commit 리뷰가 critical로 막은 경우
                (iter_dir / "commit.log").write_text(commit.stdout + commit.stderr, encoding="utf-8")
                revert(start_sha)
                rows[-1].update(status="되돌림", note="커밋 차단(pre-commit review)")
                log(f"바퀴 {iteration}: 커밋이 막혀 되돌림")
                reason = "max_iter" if iteration >= max_iter else None
            else:
                pages, reports, failures = after, after_reports, after_failures
                log(f"바퀴 {iteration}: 커밋, 게이트 미달 {len(failures)}건 {failures}")
        write_doc(prefix, started, rows, reason)

    log(f"멈춤: {reason}")
    if run(["git", "status", "--porcelain", LOG_DOC_REL]).stdout.strip():
        run(["git", "add", LOG_DOC_REL])
        run(["git", "commit", "-m", f"docs: 성능 루프 결과 기록 ({reason})"])
    print(render_section(started, rows, reason))


if __name__ == "__main__":
    main()
