import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "./server";

const state = vi.hoisted(() => ({ adapter: undefined as CookieMethodsServer | undefined }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => { state.adapter = options.cookies; return {}; }),
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("비동기 쿠키 저장소를 읽고 갱신된 쿠키 옵션을 유지한다", async () => {
  const jar = { getAll: () => [{ name: "session", value: "old" }], set: vi.fn() };
  vi.mocked(cookies).mockResolvedValue(jar as unknown as Awaited<ReturnType<typeof cookies>>);
  await createServerClient();
  expect(state.adapter!.getAll()).toEqual([{ name: "session", value: "old" }]);
  state.adapter!.setAll!([{ name: "session", value: "new", options: { httpOnly: true } }], {});
  expect(jar.set).toHaveBeenCalledWith("session", "new", { httpOnly: true });
});

it("Server Component에서 쿠키 쓰기가 금지되어도 읽을 수 있다", async () => {
  const jar = { getAll: () => [], set: () => { throw new Error("Cookies cannot be modified"); } };
  vi.mocked(cookies).mockResolvedValue(jar as unknown as Awaited<ReturnType<typeof cookies>>);
  await createServerClient();
  expect(() => state.adapter!.setAll!([{ name: "session", value: "new", options: {} }], {})).not.toThrow();
});
