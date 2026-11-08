import "server-only";
import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getSessionPlan } from "@/lib/supabase/session-plan";

export async function GET(request: NextRequest) {
  const session = await getSessionPlan();
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/api/checkout");
    return NextResponse.redirect(login);
  }
  // 같은 고객에게 구독이 둘이면 하나만 revoked돼도 웹훅이 free로 바꾸므로 두 번째 결제를 막는다.
  if (session.plan === "pro") return NextResponse.redirect(new URL("/dashboard/settings", request.url));

  // 어댑터가 읽는 쿼리는 서버 값으로만 새로 만든다.
  const url = new URL("/api/checkout", request.url);
  url.searchParams.set("products", process.env.POLAR_PRO_PRODUCT_ID!);
  url.searchParams.set("external_customer_id", session.userId);
  return Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    environment: "sandbox",
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    includeCheckoutId: false,
  })(new NextRequest(url, { headers: request.headers }));
}
