import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardLayout from "./layout";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser } }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
afterEach(() => vi.clearAllMocks());

it("세션이 없으면 자식을 표시하기 전에 로그인으로 보낸다", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  await expect(DashboardLayout({ children: <p>보호된 내용</p> })).rejects.toThrow("redirect:/login");
});

it("검증된 사용자의 자식만 렌더링한다", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  expect(renderToStaticMarkup(await DashboardLayout({ children: <p>보호된 내용</p> }))).toContain("보호된 내용");
});
