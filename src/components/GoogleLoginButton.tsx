"use client";

import { useState } from "react";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "./Button";

export function GoogleLoginButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const callback = new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL!);
      callback.searchParams.set("next", safeNextPath(next));
      const { error } = await createBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (!error) return;
    } catch {
      // 요청 실패 시 버튼을 다시 사용할 수 있게 한다.
    }
    setFailed(true);
    setPending(false);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button onClick={signIn} disabled={pending}>
        <span aria-hidden="true">G</span>
        Google 계정으로 로그인
      </Button>
      {failed && <p role="alert" className="text-body-sm text-body">로그인하지 못했어요. 다시 시도해 주세요.</p>}
    </div>
  );
}
