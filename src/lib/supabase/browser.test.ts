import { afterEach, expect, it, vi } from "vitest";
import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import { createBrowserClient } from "./browser";

vi.mock("@supabase/ssr", () => ({ createBrowserClient: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("공개 URL과 anon 키로 브라우저 클라이언트를 만든다", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
  createBrowserClient();
  expect(createSsrBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "test-anon");
});
