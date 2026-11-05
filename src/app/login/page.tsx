import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createServerClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 break-keep">
      <GoogleLoginButton next={next} />
      {params.error === "auth_failed" && (
        <p role="alert" className="text-body-sm text-body">로그인하지 못했어요. 다시 시도해 주세요.</p>
      )}
    </main>
  );
}
