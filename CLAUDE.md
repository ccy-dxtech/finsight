<!-- 프로젝트 규칙의 원본은 AGENTS.md다. Codex와 scripts/execute.py도 같은 파일을 읽으므로 규칙은 AGENTS.md에서 고친다. -->
@AGENTS.md

## Claude 전용 규칙
Playwright MCP는 Claude Code의 `.mcp.json`에만 설정돼 있어 이 규칙은 AGENTS.md에 두지 않는다.
- UI(컴포넌트, 페이지, `globals.css`)를 고친 뒤에는 `docs/BROWSER_TESTING.md` 절차대로 Playwright MCP로 화면을 열어 스크린샷(데스크톱·375px)과 콘솔 오류를 확인한 다음 완료라고 말할 것
