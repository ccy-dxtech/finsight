import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    try {
      const supabase = await createServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    } catch {
      // 네트워크 오류도 로그인 화면에서 다시 시도할 수 있게 한다.
    }
  }

  const login = new URL("/login", url.origin);
  login.searchParams.set("error", "auth_failed");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
