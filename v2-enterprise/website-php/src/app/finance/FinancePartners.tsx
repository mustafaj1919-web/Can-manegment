"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { CheckCircle2 } from "lucide-react";

const BENEFITS = [
  { en: "0% down payment on select models", ar: "بدون دفعة أولى على طرازات مختارة" },
  { en: "Approval decisions within 24 hours", ar: "قرار الموافقة خلال 24 ساعة" },
  { en: "Terms from 12 up to 72 months", ar: "مدة تقسيط من 12 حتى 72 شهراً" },
  { en: "No hidden fees or early settlement penalty", ar: "بدون رسوم خفية أو غرامة تسديد مبكر" },
];

export default function FinancePartners() {
  const { locale } = useI18n();

  return (
    <Section className="bg-bg-subtle">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>{locale === "ar" ? "لماذا التمويل معنا" : "Why Finance With Us"}</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? "شروط تمويل شفافة وعادلة" : "Transparent, fair financing terms"}
            </h2>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b.en} className="flex items-start gap-2.5 text-sm text-fg-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {locale === "ar" ? b.ar : b.en}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="card-elevated rounded-3xl p-8">
            <p className="text-sm font-extrabold">{locale === "ar" ? "جاهز للتقديم؟" : "Ready to apply?"}</p>
            <p className="mt-2 text-sm text-fg-muted">
              {locale === "ar"
                ? "املأ طلب التمويل وسيتواصل معك أحد مستشارينا الماليين خلال 24 ساعة."
                : "Complete the financing application and one of our finance advisors will reach out within 24 hours."}
            </p>
            <Link
              href="/finance/installments"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-dark"
            >
              {locale === "ar" ? "قدّم طلب التمويل" : "Apply for Financing"}
            </Link>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
