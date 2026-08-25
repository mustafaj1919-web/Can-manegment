"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Heart, Eye, Users } from "lucide-react";

const VALUES = [
  { icon: Eye, en: { t: "Transparency", d: "No hidden fees, no pressure tactics — every price and term is clear from the start." }, ar: { t: "الشفافية", d: "بدون رسوم خفية أو أساليب ضغط — كل سعر وشرط واضح من البداية." } },
  { icon: Heart, en: { t: "Care", d: "Our relationship doesn't end at delivery — genuine parts and certified service for the life of your vehicle." }, ar: { t: "العناية", d: "علاقتنا لا تنتهي عند التسليم — قطع غيار أصلية وصيانة معتمدة طوال عمر سيارتك." } },
  { icon: Users, en: { t: "Community", d: "We're proud to be Iraqi-owned and operated, investing in local talent and local service." }, ar: { t: "المجتمع", d: "نفخر بكوننا شركة عراقية بالكامل، نستثمر في الكفاءات والخدمات المحلية." } },
];

export default function AboutValues() {
  const { locale } = useI18n();
  return (
    <Section>
      <Container>
        <Reveal className="text-center">
          <Eyebrow className="justify-center">{locale === "ar" ? "قيمنا" : "Our Values"}</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {locale === "ar" ? "ما يوجّه كل قرار نتخذه" : "What guides every decision we make"}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {VALUES.map((v, i) => {
            const c = locale === "ar" ? v.ar : v.en;
            return (
              <Reveal key={c.t} delay={i * 0.08} className="card-elevated rounded-2xl p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <v.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-extrabold">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{c.d}</p>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
