import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Hero } from "@/components/Hero";
import { StepList } from "@/components/StepList";
import { PricingTier } from "@/components/PricingTier";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "FinSight — 카드 명세서로 보는 AI 지출 리포트",
  description: "카드사에서 받은 명세서(CSV·엑셀)를 올리면 어디에 많이 썼는지, 무엇을 줄일 수 있는지 한국어 리포트로 알려드려요.",
};

const container = "mx-auto max-w-[1200px] px-8";

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const priceLabel = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "월 1,000원";

  return (
    <>
      <header className="border-b border-hairline bg-canvas">
        <div className={`${container} flex h-16 items-center justify-between gap-4`}>
          <Link href="/" className="text-title-md font-extrabold text-ink">Fin<b className="text-primary">Sight</b></Link>
          <Button variant="secondary" size="md" href={user ? "/dashboard" : "/login"}>
            {user ? "대시보드로 가기" : "로그인"}
          </Button>
        </div>
      </header>
      <main>
        <Hero isLoggedIn={Boolean(user)} />
        <section aria-labelledby="steps-title" className="break-keep bg-surface-soft py-24">
          <div className={container}>
            <h2 id="steps-title" className="mb-8 text-display-md text-ink">이렇게 시작해요</h2>
            <StepList />
          </div>
        </section>
        <section id="pricing" aria-labelledby="pricing-title" className="break-keep py-24">
          <div className={container}>
            <h2 id="pricing-title" className="mb-8 text-display-md text-ink">나에게 맞는 요금제</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <PricingTier tier="free" priceLabel="0원" />
              <PricingTier tier="pro" priceLabel={priceLabel} />
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-hairline bg-surface-soft py-12">
        <div className={`${container} flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between`}>
          <p className="text-title-md font-extrabold text-ink">Fin<b className="text-primary">Sight</b></p>
          <p className="text-caption text-muted">카드 명세서를 올리면, 새는 돈이 보여요.</p>
        </div>
      </footer>
    </>
  );
}
