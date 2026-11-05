import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // 여러 번 쓰더라도 기존 응답 쿠키와 첫 쓰기의 캐시 헤더를 유지한다.
          response = NextResponse.next({ request, headers: response.headers });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
