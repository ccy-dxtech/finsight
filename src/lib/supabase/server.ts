import "server-only";
import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없어 proxy에서 갱신한다.
          }
        },
      },
    },
  );
}
