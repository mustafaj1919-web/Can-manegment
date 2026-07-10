"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const MILESTONES = [
  { year: "2014", en: "Al-Sadaka Motors founded in Baghdad, importing quality used vehicles.", ar: "تأسست الأصدقاء للسيارات في بغداد كمستورد لسيارات مستعملة عالية الجودة." },
  { year: "2019", en: "Opened our second showroom in Karrada with a dedicated service center.", ar: "افتتاح المعرض الثاني في الكرادة مع مركز صيانة متخصص." },
  { year: "2023", en: "Became Iraq's first authorized BYD dealer, launching the electric lineup.", ar: "أصبحنا أول وكيل معتمد لسيارات BYD في العراق، وأطلقنا التشكيلة الكهربائية." },
  { year: "2026", en: "Four full-service showrooms and over 4,200 vehicles delivered nationwide.", ar: "أربعة معارض متكاملة الخدمات وأكثر من 4,200 سيارة تم تسليمها في جميع أنحاء العراق." },
];

export default function AboutTimeline() {
  const { locale } = useI18n();
  return (
    <Section className="bg-bg-subtle">
      <Container className="max-w-3xl">
        <Reveal>
          <Eyebrow>{locale === "ar" ? "رحلتنا" : "Our Journey"}</Eyebrow>
        </Reveal>
        <div className="mt-8 space-y-0">
          {MILESTONES.map((m, i) => (
            <Reveal key={m.year} delay={i * 0.08} className="flex gap-6 border-s-2 border-border py-6 ps-6 last:pb-0">
              <div className="relative">
                <span className="absolute -start-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <div>
                <p className="text-sm font-black text-primary">{m.year}</p>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{locale === "ar" ? m.ar : m.en}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
