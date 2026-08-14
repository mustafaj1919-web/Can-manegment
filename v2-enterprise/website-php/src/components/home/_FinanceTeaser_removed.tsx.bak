"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import FinanceCalculator from "@/components/finance/FinanceCalculator";

export default function FinanceTeaser() {
  const { locale } = useI18n();

  return (
    <Section className="bg-bg-subtle">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">{locale === "ar" ? "التمويل" : "Financing"}</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {locale === "ar" ? "احسب قسطك الشهري في ثوانٍ" : "Calculate your monthly payment in seconds"}
          </h2>
          <p className="mt-4 text-fg-muted">
            {locale === "ar"
              ? "خطط تمويل مرنة بالتعاون مع مصارف عراقية موثوقة، بموافقة سريعة."
              : "Flexible financing plans with trusted Iraqi banks, fast approval."}
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mx-auto mt-10 max-w-4xl">
          <FinanceCalculator />
        </Reveal>
      </Container>
    </Section>
  );
}
