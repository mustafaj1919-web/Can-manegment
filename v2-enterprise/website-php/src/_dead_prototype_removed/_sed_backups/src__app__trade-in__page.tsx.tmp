import { Suspense } from "react";
import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import TradeInForm from "./TradeInForm";
import TradeInSteps from "./TradeInSteps";
import { Container, Section } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Trade In Your Vehicle",
  description: "Get an instant estimated valuation for your current vehicle and apply it toward a new BYD.",
};

export default function TradeInPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Trade In", ar: "استبدال سيارتك" }}
        title={{ en: "Trade in your current vehicle", ar: "استبدل سيارتك الحالية" }}
        description={{
          en: "Tell us about your car and we'll provide an estimated valuation to apply toward your new BYD.",
          ar: "أخبرنا عن سيارتك وسنقدّم تقييماً تقديرياً يمكنك استخدامه عند شراء سيارتك الجديدة.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="card-elevated rounded-3xl p-6 sm:p-8">
              <Suspense fallback={null}>
                <TradeInForm />
              </Suspense>
            </div>
            <TradeInSteps />
          </div>
        </Container>
      </Section>
    </>
  );
}
