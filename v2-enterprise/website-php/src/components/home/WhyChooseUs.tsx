"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Award, Wallet, Truck, Wrench } from "lucide-react";

const REASONS = [
  { icon: Award, en: { t: "Authorized Dealer", d: "Genuine BYD vehicles with full manufacturer warranty coverage." }, ar: { t: "وكيل معتمد", d: "سيارات BYD أصلية بضمان كامل من الشركة المصنّعة." } },
  { icon: Wallet, en: { t: "Flexible Financing", d: "Installment plans tailored to your budget, approved in 24 hours." }, ar: { t: "تمويل مرن", d: "خطط تقسيط تناسب ميزانيتك، بموافقة خلال 24 ساعة." } },
  { icon: Truck, en: { t: "Nationwide Delivery", d: "We deliver to Baghdad, Erbil, Basra, and every governorate in between." }, ar: { t: "توصيل لكل العراق", d: "نوصل إلى بغداد وأربيل والبصرة وكل المحافظات." } },
  { icon: Wrench, en: { t: "Certified Service", d: "Factory-trained technicians and genuine parts at every visit." }, ar: { t: "صيانة معتمدة", d: "فنيون مدربون من الشركة وقطع غيار أصلية في كل زيارة." } },
];

export default function WhyChooseUs() {
  const { locale } = useI18n();

  return (
    <Section>
      <Container>
        <Reveal className="text-center">
          <Eyebrow className="justify-center">{locale === "ar" ? "لماذا الأصدقاء" : "Why Choose Us"}</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {locale === "ar" ? "شريكك الموثوق في التنقل الكهربائي" : "Your trusted partner in electric mobility"}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r, i) => {
            const Icon = r.icon;
            const c = locale === "ar" ? r.ar : r.en;
            return (
              <Reveal key={c.t} delay={i * 0.08}>
                <div className="card-elevated h-full rounded-2xl p-6 transition hover:-translate-y-1">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold">{c.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{c.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
