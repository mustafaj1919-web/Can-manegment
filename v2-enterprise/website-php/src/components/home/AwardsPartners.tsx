"use client";

import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Trophy } from "lucide-react";

const AWARDS = [
  { en: "World EV Day — Regional Dealer of the Year", ar: "اليوم العالمي للسيارات الكهربائية — أفضل وكيل إقليمي", year: "2025" },
  { en: "BYD Excellence in Customer Service", ar: "تميز BYD في خدمة العملاء", year: "2024" },
  { en: "Iraq Automotive Awards — Best EV Showroom", ar: "جوائز السيارات العراقية — أفضل معرض كهربائي", year: "2024" },
];

const PARTNERS = ["BYD", "Blade Battery", "e-Platform 3.0", "DiPilot", "Rafidain Bank", "Al-Rasheed Bank"];

export default function AwardsPartners() {
  const { locale } = useI18n();

  return (
    <Section className="bg-bg-subtle">
      <Container>
        <div className="grid gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>{locale === "ar" ? "الجوائز" : "Awards"}</Eyebrow>
            <h2 className="mt-3 text-balance text-2xl font-black tracking-tight sm:text-3xl">
              {locale === "ar" ? "تكريم يعكس التزامنا" : "Recognition that reflects our commitment"}
            </h2>
            <div className="mt-6 space-y-4">
              {AWARDS.map((a) => (
                <div key={a.en} className="flex items-start gap-4 rounded-xl border border-border bg-bg-elevated p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{locale === "ar" ? a.ar : a.en}</p>
                    <p className="text-xs text-fg-subtle">{a.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Eyebrow>{locale === "ar" ? "شركاؤنا" : "Partners"}</Eyebrow>
            <h2 className="mt-3 text-balance text-2xl font-black tracking-tight sm:text-3xl">
              {locale === "ar" ? "تقنيات وشراكات موثوقة" : "Trusted technology & finance partners"}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {PARTNERS.map((p) => (
                <div
                  key={p}
                  className="flex h-16 items-center justify-center rounded-xl border border-border bg-bg-elevated px-4 text-sm font-bold text-fg-muted"
                >
                  {p}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
