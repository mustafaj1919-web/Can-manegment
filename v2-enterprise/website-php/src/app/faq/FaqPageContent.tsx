"use client";

import { useI18n } from "@/lib/i18n/context";
import { FAQ_EN, FAQ_AR } from "@/lib/data/faq";
import FaqAccordion from "@/components/shared/FaqAccordion";

export default function FaqPageContent() {
  const { locale } = useI18n();
  const items = locale === "ar" ? FAQ_AR : FAQ_EN;
  return <FaqAccordion items={items} />;
}
