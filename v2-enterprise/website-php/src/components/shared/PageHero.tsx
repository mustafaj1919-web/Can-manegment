"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { ReactNode } from "react";

type Bilingual = { en: string; ar: string };

interface PageHeroProps {
  eyebrow?: Bilingual;
  title: Bilingual;
  description?: Bilingual;
  className?: string;
  children?: ReactNode;
  align?: "start" | "center";
}

export default function PageHero({ eyebrow, title, description, className, children, align = "start" }: PageHeroProps) {
  const { locale } = useI18n();

  return (
    <section className={cn("relative overflow-hidden pb-14 pt-36 md:pb-20 md:pt-44", className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 start-1/3 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <Container className={cn("relative", align === "center" && "text-center")}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {locale === "ar" ? eyebrow.ar : eyebrow.en}
            </span>
          )}
          <h1 className={cn("mt-3 text-balance text-4xl font-black tracking-tight sm:text-5xl", align === "center" && "mx-auto max-w-2xl")}>
            {locale === "ar" ? title.ar : title.en}
          </h1>
          {description && (
            <p className={cn("mt-4 max-w-xl text-fg-muted", align === "center" && "mx-auto")}>
              {locale === "ar" ? description.ar : description.en}
            </p>
          )}
        </motion.div>
        {children}
      </Container>
    </section>
  );
}
