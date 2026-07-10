"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Container, Section } from "@/components/ui/Container";
import CtaBanner from "@/components/shared/CtaBanner";
import type { NewsPost } from "@/lib/types";

export default function BlogArticleClient({ post }: { post: NewsPost }) {
  const { locale } = useI18n();
  const body = locale === "ar" ? post.bodyAr : post.bodyEn;

  return (
    <>
      <Section className="pb-0 pt-32 md:pt-40">
        <Container className="max-w-3xl">
          <nav className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Link href="/" className="hover:text-primary">{locale === "ar" ? "الرئيسية" : "Home"}</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary">{locale === "ar" ? "المدونة" : "Blog"}</Link>
          </nav>
          <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {post.category}
          </span>
          <h1 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            {locale === "ar" ? post.titleAr : post.titleEn}
          </h1>
          <p className="mt-4 flex items-center gap-1.5 text-sm text-fg-subtle">
            <Calendar className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString(locale === "ar" ? "ar-IQ" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </Container>
      </Section>
      <Section>
        <Container className="max-w-3xl">
          <div className="h-56 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5" />
          <div className="mt-8 space-y-5">
            {body.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-fg-muted">
                {p}
              </p>
            ))}
          </div>
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
