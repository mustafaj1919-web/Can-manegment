"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/ui/SocialIcons";
import { useI18n } from "@/lib/i18n/context";
import { BRAND, LOCATIONS } from "@/lib/data/locations";
import { Container } from "@/components/ui/Container";

const columns = [
  {
    titleEn: "Shop",
    titleAr: "السيارات",
    links: [
      { en: "All Vehicles", ar: "جميع السيارات", href: "/vehicles" },
      { en: "Offers", ar: "العروض", href: "/offers" },
      { en: "Compare", ar: "المقارنة", href: "/compare" },
      { en: "Book Test Drive", ar: "احجز تجربة قيادة", href: "/test-drive" },
      { en: "Trade In", ar: "استبدال سيارتك", href: "/trade-in" },
    ],
  },
  {
    titleEn: "Technology",
    titleAr: "التقنيات",
    links: [
      { en: "Electric Technology", ar: "التقنية الكهربائية", href: "/technology/electric" },
      { en: "Battery Technology", ar: "تقنية البطاريات", href: "/technology/battery" },
      { en: "Charging Solutions", ar: "حلول الشحن", href: "/technology/charging" },
      { en: "Finance Calculator", ar: "حاسبة التمويل", href: "/finance" },
      { en: "Installments", ar: "الأقساط", href: "/finance/installments" },
    ],
  },
  {
    titleEn: "Company",
    titleAr: "الشركة",
    links: [
      { en: "About Us", ar: "من نحن", href: "/about" },
      { en: "Locations", ar: "فروعنا", href: "/locations" },
      { en: "News", ar: "الأخبار", href: "/news" },
      { en: "Blog", ar: "المدونة", href: "/blog" },
      { en: "Gallery", ar: "المعرض", href: "/gallery" },
    ],
  },
  {
    titleEn: "Support",
    titleAr: "الدعم",
    links: [
      { en: "Contact Us", ar: "تواصل معنا", href: "/contact" },
      { en: "FAQ", ar: "الأسئلة الشائعة", href: "/faq" },
      { en: "Privacy Policy", ar: "سياسة الخصوصية", href: "/privacy-policy" },
      { en: "Terms of Service", ar: "الشروط والأحكام", href: "/terms" },
    ],
  },
];

export default function Footer() {
  const { locale } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border bg-bg-subtle">
      <Container className="py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-black text-lg">
                أ
              </span>
              <span className="text-base font-extrabold">{locale === "ar" ? BRAND.nameAr : BRAND.nameEn}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
              {locale === "ar"
                ? "الوكيل المعتمد لسيارات BYD الكهربائية في العراق. نقدم تجربة شراء رقمية متكاملة تجمع بين الفخامة والتقنية وخدمة ما بعد البيع الموثوقة."
                : "Iraq's authorized BYD electric vehicle dealer. A fully digital buying experience combining luxury, technology, and trusted after-sales care."}
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-sm text-fg-muted">
              <a href={`tel:${BRAND.phone}`} className="flex items-center gap-2.5 hover:text-primary">
                <Phone className="h-4 w-4 shrink-0" /> {BRAND.phone}
              </a>
              <a href={`mailto:${BRAND.email}`} className="flex items-center gap-2.5 hover:text-primary">
                <Mail className="h-4 w-4 shrink-0" /> {BRAND.email}
              </a>
              <span className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {locale === "ar" ? LOCATIONS[0].addressAr : LOCATIONS[0].addressEn}
              </span>
            </div>
            <div className="mt-6 flex gap-2">
              {[FacebookIcon, InstagramIcon, YoutubeIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-fg-muted transition hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.titleEn}>
                <p className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
                  {locale === "ar" ? col.titleAr : col.titleEn}
                </p>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm font-medium text-fg-muted hover:text-primary">
                        {locale === "ar" ? l.ar : l.en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-fg-subtle sm:flex-row">
          <p>
            © {year} {locale === "ar" ? BRAND.nameAr : BRAND.nameEn}.{" "}
            {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-primary">
              {locale === "ar" ? "الخصوصية" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-primary">
              {locale === "ar" ? "الشروط" : "Terms"}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
