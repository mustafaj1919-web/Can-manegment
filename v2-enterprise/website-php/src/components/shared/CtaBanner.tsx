"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { ChevronRight } from "lucide-react";

export default function CtaBanner() {
  const { locale, dict } = useI18n();

  return (
    <Section className="py-20">
      <Container>
        <Reveal className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-white sm:px-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -end-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -start-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? "جاهز لتجربة القيادة الكهربائية؟" : "Ready to experience electric driving?"}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/85">
              {locale === "ar"
                ? "احجز تجربة قيادة مجانية اليوم في أقرب معرض من الأصدقاء للسيارات."
                : "Book a free test drive today at your nearest Al-Sadaka Motors showroom."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <LinkButton href="/test-drive" variant="secondary" size="lg" icon={<ChevronRight className="h-4 w-4 rtl:rotate-180" />}>
                {dict.cta.bookTestDrive}
              </LinkButton>
              <LinkButton href="/contact" variant="glass" size="lg" className="border-white/30 text-white">
                {dict.cta.contactUs}
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
