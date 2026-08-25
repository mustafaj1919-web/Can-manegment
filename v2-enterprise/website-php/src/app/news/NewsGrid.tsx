"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { NEWS } from "@/lib/data/news";
import { Reveal } from "@/components/ui/Reveal";

export default function NewsGrid() {
  const { locale } = useI18n();

  return (
    <div className="grid gap-6 md:grid-cols-3">
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
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-fg-muted">{locale === "ar" ? n.excerptAr : n.excerptEn}</p>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
