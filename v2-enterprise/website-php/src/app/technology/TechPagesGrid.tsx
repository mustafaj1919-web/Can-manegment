"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const PAGES = [
  { href: "/technology/electric", en: "Electric Technology", ar: "التقنية الكهربائية", descEn: "e-Platform 3.0 and DiPilot driver assistance.", descAr: "منصة e-Platform 3.0 ونظام DiPilot لمساعدة السائق." },
  { href: "/technology/battery", en: "Battery Technology", ar: "تقنية البطاريات", descEn: "Blade Battery safety and Cell-to-Body engineering.", descAr: "أمان بطارية Blade وهندسة دمج الخلايا بالهيكل." },
  { href: "/technology/charging", en: "Charging Solutions", ar: "حلول الشحن", descEn: "Home, public, and DC fast charging across Iraq.", descAr: "الشحن المنزلي والعام والسريع في جميع أنحاء العراق." },
];

export default function TechPagesGrid() {
  const { locale } = useI18n();
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href} className="card-elevated group rounded-2xl p-6 transition hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-extrabold">{locale === "ar" ? p.ar : p.en}</h3>
            <ArrowUpRight className="h-4 w-4 text-fg-subtle group-hover:text-primary" />
          </div>
          <p className="mt-2 text-sm text-fg-muted">{locale === "ar" ? p.descAr : p.descEn}</p>
        </Link>
      ))}
    </div>
  );
}
