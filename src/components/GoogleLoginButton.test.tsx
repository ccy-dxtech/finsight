import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoogleLoginButton } from "./GoogleLoginButton";

vi.mock("@/lib/supabase/browser", () => ({ createBrowserClient: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it("Google 로그인 버튼 하나를 표시한다", () => {
  const html = renderToStaticMarkup(<GoogleLoginButton next="/dashboard" />);
  expect(html).toContain("Google 계정으로 로그인");
  expect(html.match(/<button/g)).toHaveLength(1);
});
