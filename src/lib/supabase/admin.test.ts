import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-secret");
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it.each([undefined, ""])("비밀 키가 %s이면 명확한 오류를 던진다", (value) => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", value);
  expect(() => createAdminClient()).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  expect(createClient).not.toHaveBeenCalled();
});

it("웹훅 클라이언트는 비밀 키를 쓰고 세션을 저장하거나 갱신하지 않는다", () => {
  createAdminClient();
  expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "test-secret", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
});

it("서버 모듈은 서버 전용이며 브라우저 소스는 비밀 키를 참조하지 않는다", () => {
  for (const name of ["admin", "server"]) {
    expect(readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8")).toContain('import "server-only"');
  }
  expect(readFileSync(new URL("./browser.ts", import.meta.url), "utf8")).not.toContain("SERVICE_ROLE");
});
