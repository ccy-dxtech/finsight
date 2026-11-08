import { Hero } from "@/components/Hero";
import { StepList } from "@/components/StepList";
import { PricingTier } from "@/components/PricingTier";
import { createServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const priceLabel = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "월 1,000원";

  return (
    <>
      <main className="mx-auto max-w-[1200px] px-8">
        <Hero isLoggedIn={Boolean(user)} />
        <section aria-labelledby="steps-title" className="break-keep py-24">
          <h2 id="steps-title" className="mb-8 text-display-md text-ink">이렇게 시작해요</h2>
          <StepList />
        </section>
        <section id="pricing" aria-labelledby="pricing-title" className="break-keep py-24">
          <h2 id="pricing-title" className="mb-8 text-display-md text-ink">나에게 맞는 요금제</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <PricingTier tier="free" priceLabel="0원" />
            <PricingTier tier="pro" priceLabel={priceLabel} />
          </div>
        </section>
      </main>
      <footer className="bg-surface-soft py-12 text-caption text-muted">
        <div className="mx-auto max-w-[1200px] px-8">FinSight</div>
      </footer>
    </>
  );
}
