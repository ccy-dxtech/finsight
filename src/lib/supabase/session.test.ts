import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CookieMethodsServer } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { updateSession } from "./session";

const state = vi.hoisted(() => ({ adapter: undefined as CookieMethodsServer | undefined, getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    state.adapter = options.cookies;
    return { auth: { getUser: state.getUser } };
  }),
}));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("로그인하지 않은 요청은 사용자 없이 계속 진행한다", async () => {
  state.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const { response, user } = await updateSession(new NextRequest("https://example.com/dashboard"));
  expect(user).toBeNull();
  expect(response.headers.get("x-middleware-next")).toBe("1");
});

it("검증된 사용자와 갱신 쿠키를 요청·응답에 전파하고 캐시 방지 헤더를 유지한다", async () => {
  const request = new NextRequest("https://example.com/dashboard", { headers: { cookie: "session=old" } });
  const user = { id: "user-id", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-05T00:00:00Z" } satisfies User;
  state.getUser.mockImplementation(async () => {
    expect(state.adapter!.getAll()).toEqual([{ name: "session", value: "old" }]);
    await state.adapter!.setAll!([{ name: "session", value: "new", options: { httpOnly: true, path: "/" } }], {
      "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache",
    });
    // SSR는 첫 쓰기에만 캐시 헤더를 전달한다.
    await state.adapter!.setAll!([{ name: "verifier", value: "second", options: { path: "/" } }], {});
    return { data: { user }, error: null };
  });
  const result = await updateSession(request);
  expect(result.user).toEqual(user);
  expect(request.cookies.get("session")?.value).toBe("new");
  expect(result.response.headers.get("x-middleware-request-cookie")).toContain("session=new");
  expect(result.response.cookies.get("session")).toMatchObject({ value: "new", httpOnly: true });
  expect(result.response.cookies.get("verifier")?.value).toBe("second");
  expect(result.response.headers.get("cache-control")).toBe("private, no-store");
  expect(result.response.headers.get("expires")).toBe("0");
  expect(result.response.headers.get("pragma")).toBe("no-cache");
});
