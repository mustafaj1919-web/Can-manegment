"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";
import { ArrowUpRight } from "lucide-react";
import type { VehicleCategory } from "@/lib/types";

const CATS: { key: VehicleCategory; en: string; ar: string; descEn: string; descAr: string }[] = [
  { key: "sedan", en: "Sedans", ar: "سيدان", descEn: "Executive comfort, everyday efficiency", descAr: "راحة تنفيذية وكفاءة يومية" },
  { key: "suv", en: "SUVs", ar: "دفع رباعي", descEn: "Space and safety for the whole family", descAr: "مساحة وأمان لكل العائلة" },
  { key: "performance", en: "Performance", ar: "أداء رياضي", descEn: "Blistering acceleration, sculpted design", descAr: "تسارع خاطف وتصميم منحوت" },
  { key: "hatchback", en: "City Hatchbacks", ar: "هاتشباك المدينة", descEn: "Nimble, efficient, effortless to park", descAr: "رشيقة واقتصادية وسهلة الركن" },
];

export default function Categories() {
  const { locale } = useI18n();

  return (
    <Section className="bg-bg-subtle">
      <Container>
        <Reveal>
          <Eyebrow>{locale === "ar" ? "التصنيفات" : "Categories"}</Eyebrow>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {locale === "ar" ? "اختر الفئة التي تناسبك" : "Find the category that fits you"}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATS.map((c, i) => {
            const count = VEHICLES.filter((v) => v.category === c.key).length;
            return (
              <Reveal key={c.key} delay={i * 0.08}>
                <Link
                  href={`/vehicles?category=${c.key}`}
                  className="card-elevated group relative flex h-full flex-col overflow-hidden rounded-2xl transition-all hover:-translate-y-1"
                >
                  <div className="h-40 bg-bg-muted">
                    <VehicleStudioRender category={c.key} className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-extrabold">{locale === "ar" ? c.ar : c.en}</h3>
                      <ArrowUpRight className="h-4 w-4 text-fg-subtle transition group-hover:text-primary" />
                    </div>
                    <p className="mt-1.5 text-sm text-fg-muted">{locale === "ar" ? c.descAr : c.descEn}</p>
                    <p className="mt-auto pt-4 text-xs font-bold text-primary">
                      {count} {locale === "ar" ? "طرازات" : "models"}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
