"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { NEWS } from "@/lib/data/news";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { ArrowRight, Calendar } from "lucide-react";

export default function LatestNews() {
  const { locale, dict } = useI18n();

  return (
    <Section>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <Eyebrow>{locale === "ar" ? "آخر الأخبار" : "Latest News"}</Eyebrow>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? "جديدنا وفعالياتنا" : "What's new at Al-Sadaka"}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <LinkButton href="/news" variant="outline" icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}>
              {dict.cta.seeAll}
            </LinkButton>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {NEWS.map((n, i) => (
            <Reveal key={n.slug} delay={i * 0.08}>
              <Link href={`/news/${n.slug}`} className="card-elevated group flex h-full flex-col overflow-hidden rounded-2xl">
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold uppercase tracking-wide text-primary">
                  {n.category}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(n.date).toLocaleDateString(locale === "ar" ? "ar-IQ" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <h3 className="mt-2 text-base font-extrabold leading-snug transition group-hover:text-primary">
                    {locale === "ar" ? n.titleAr : n.titleEn}
                  </h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-fg-muted">
                    {locale === "ar" ? n.excerptAr : n.excerptEn}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
