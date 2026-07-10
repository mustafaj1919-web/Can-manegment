"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const REVIEWS = [
  {
    en: { name: "Ahmed Al-Kaabi", role: "Song Plus Owner", quote: "The buying process was completely transparent — from the finance calculator to delivery in Karrada. My family loves the space and the safety features." },
    ar: { name: "أحمد الكعبي", role: "مالك سونغ بلس", quote: "عملية الشراء كانت شفافة بالكامل — من حاسبة التمويل إلى التسليم في الكرادة. عائلتي معجبة بالمساحة وميزات الأمان." },
  },
  {
    en: { name: "Sara Hassan", role: "Seagull Owner", quote: "Best value electric car I could find in Baghdad. Charging at home costs almost nothing compared to fuel, and the service team is excellent." },
    ar: { name: "سارة حسن", role: "مالكة سيغال", quote: "أفضل سيارة كهربائية من ناحية القيمة وجدتها في بغداد. الشحن في المنزل يكلف القليل مقارنة بالوقود، وفريق الصيانة ممتاز." },
  },
  {
    en: { name: "Omar Jassim", role: "Han EV Owner", quote: "The Han feels like a true luxury flagship. Acceleration is shocking for the price point, and the Al-Sadaka team made financing painless." },
    ar: { name: "عمر جاسم", role: "مالك هان EV", quote: "هان تشعرك بسيارة فاخرة حقيقية. التسارع مذهل مقارنة بالسعر، وفريق الأصدقاء سهّل عملية التمويل." },
  },
];

export default function Testimonials() {
  const { locale } = useI18n();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: locale === "ar" ? "rtl" : "ltr" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", () => setSelected(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  return (
    <Section>
      <Container>
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>{locale === "ar" ? "آراء العملاء" : "Customer Reviews"}</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? "ثقة أكثر من 4,200 عميل" : "Trusted by 4,200+ customers"}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition hover:border-primary hover:text-primary"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition hover:border-primary hover:text-primary"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </Reveal>

        <div className="mt-10 overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {REVIEWS.map((r, i) => {
              const c = locale === "ar" ? r.ar : r.en;
              return (
                <div key={i} className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_48%] lg:flex-[0_0_32%]">
                  <div className="card-elevated flex h-full flex-col rounded-2xl p-6">
                    <div className="flex gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-fg-muted">&ldquo;{c.quote}&rdquo;</p>
                    <div className="mt-5 border-t border-border pt-4">
                      <p className="text-sm font-extrabold">{c.name}</p>
                      <p className="text-xs text-fg-subtle">{c.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {REVIEWS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${selected === i ? "w-6 bg-primary" : "w-1.5 bg-border-strong"}`}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
