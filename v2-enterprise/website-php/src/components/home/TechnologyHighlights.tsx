"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { BatteryCharging, ShieldCheck, Cpu, Zap } from "lucide-react";

const TECHS = [
  {
    icon: BatteryCharging,
    en: { title: "Blade Battery", desc: "LFP cell-to-body architecture engineered to survive nail penetration and extreme heat without thermal runaway." },
    ar: { title: "بطارية Blade", desc: "بنية خلايا LFP مدمجة بالهيكل، مصممة لتحمل الاختراق والحرارة الشديدة دون انفجار حراري." },
    href: "/technology/battery",
  },
  {
    icon: Cpu,
    en: { title: "e-Platform 3.0", desc: "A dedicated EV architecture unifying motor, electronics, and body into one ultra-efficient system." },
    ar: { title: "منصة e-Platform 3.0", desc: "بنية كهربائية مخصصة توحّد المحرك والإلكترونيات والهيكل في نظام فائق الكفاءة." },
    href: "/technology/electric",
  },
  {
    icon: ShieldCheck,
    en: { title: "DiPilot ADAS", desc: "Intelligent driver-assistance radar suite for adaptive cruise, lane centering, and collision avoidance." },
    ar: { title: "نظام DiPilot", desc: "حزمة رادار ذكية لمساعدة السائق تشمل التحكم التكيفي بالسرعة وتفادي الاصطدام." },
    href: "/technology/electric",
  },
  {
    icon: Zap,
    en: { title: "Flash Charging", desc: "DC fast charging replenishes 30–80% capacity in as little as 26 minutes across the lineup." },
    ar: { title: "الشحن السريع", desc: "شحن تيار مستمر يعيد الشحن من 30% إلى 80% خلال 26 دقيقة فقط حسب الطراز." },
    href: "/technology/charging",
  },
];

export default function TechnologyHighlights() {
  const { locale } = useI18n();

  return (
    <Section className="relative overflow-hidden bg-carbon text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -end-40 top-0 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[130px]" />
      </div>
      <Container className="relative">
        <Reveal>
          <Eyebrow>{locale === "ar" ? "تقنيات BYD" : "BYD Technologies"}</Eyebrow>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">
            {locale === "ar" ? "هندسة تعيد تعريف السلامة والكفاءة" : "Engineering that redefines safety and efficiency"}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {TECHS.map((t, i) => {
            const Icon = t.icon;
            const content = locale === "ar" ? t.ar : t.en;
            return (
              <Reveal key={t.en.title} delay={i * 0.08}>
                <a href={t.href} className="group flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-primary/50 hover:bg-white/[0.06]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold text-white">{content.title}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-white/60">{content.desc}</span>
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2} className="mt-10">
          <LinkButton href="/technology/electric" variant="glass" className="border-white/20 text-white">
            {locale === "ar" ? "استكشف كل التقنيات" : "Explore all technology"}
          </LinkButton>
        </Reveal>
      </Container>
    </Section>
  );
}
