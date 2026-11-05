import "server-only";
import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/api/checkout");
    return NextResponse.redirect(login);
  }

  // 어댑터가 읽는 쿼리는 서버 값으로만 새로 만든다.
  const url = new URL("/api/checkout", request.url);
  url.searchParams.set("products", process.env.POLAR_PRO_PRODUCT_ID!);
  url.searchParams.set("external_customer_id", user.id);
  return Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    environment: "sandbox",
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    includeCheckoutId: false,
  })(new NextRequest(url, { headers: request.headers }));
}
