"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Counter } from "@/components/ui/Counter";

const STATS = [
  { value: 4200, suffix: "+", en: "Vehicles Delivered", ar: "سيارة تم تسليمها" },
  { value: 4, suffix: "", en: "Showrooms Nationwide", ar: "معارض في العراق" },
  { value: 98, suffix: "%", en: "Customer Satisfaction", ar: "رضا العملاء" },
  { value: 12, suffix: "", en: "Years of Trust", ar: "سنوات من الثقة" },
];

export default function StatsSection() {
  const { locale } = useI18n();

  return (
    <Section className="bg-primary py-16 text-white md:py-20">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.en} delay={i * 0.08} className="text-center md:text-start">
              <p className="text-4xl font-black tracking-tight sm:text-5xl">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm font-medium text-white/80">{locale === "ar" ? s.ar : s.en}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
