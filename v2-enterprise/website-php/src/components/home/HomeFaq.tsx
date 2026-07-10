"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import FaqAccordion from "@/components/shared/FaqAccordion";
import { FAQ_EN, FAQ_AR } from "@/lib/data/faq";
import { LinkButton } from "@/components/ui/Button";

export default function HomeFaq() {
  const { locale } = useI18n();
  const items = locale === "ar" ? FAQ_AR : FAQ_EN;

  return (
    <Section className="bg-bg-subtle">
      <Container className="max-w-3xl">
        <Reveal className="text-center">
          <Eyebrow className="justify-center">{locale === "ar" ? "الأسئلة الشائعة" : "FAQ"}</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {locale === "ar" ? "أسئلة يتكرر طرحها" : "Questions we hear often"}
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <FaqAccordion items={items.slice(0, 5)} />
        </Reveal>
        <Reveal delay={0.15} className="mt-8 text-center">
          <LinkButton href="/faq" variant="outline">
            {locale === "ar" ? "عرض جميع الأسئلة" : "View all FAQs"}
          </LinkButton>
        </Reveal>
      </Container>
    </Section>
  );
}
