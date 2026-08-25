"use client";

import { useI18n } from "@/lib/i18n/context";
import LeadForm from "@/components/shared/LeadForm";

export default function ContactFormSection() {
  const { locale } = useI18n();

  return (
    <LeadForm
      type="contact"
      showMessage
      submitLabel={locale === "ar" ? "إرسال الرسالة" : "Send Message"}
    />
  );
}
