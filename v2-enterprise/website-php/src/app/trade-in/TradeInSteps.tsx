"use client";

import { ShieldCheck, Clock3, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const STEPS = [
  { icon: Wallet, en: "Submit your vehicle details", ar: "أرسل تفاصيل سيارتك الحالية" },
  { icon: Clock3, en: "Get an estimated valuation within hours", ar: "احصل على تقييم تقديري خلال ساعات" },
  { icon: ShieldCheck, en: "Confirm in person and apply it to your purchase", ar: "أكّد حضورياً واستخدمه في عملية الشراء" },
];

export default function TradeInSteps() {
  const { locale } = useI18n();
  return (
    <div className="space-y-4">
      {STEPS.map((s, i) => (
        <div key={s.en} className="card-elevated flex items-start gap-4 rounded-2xl p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
            {i + 1}
          </span>
          <p className="text-sm font-semibold text-fg-muted">{locale === "ar" ? s.ar : s.en}</p>
          <s.icon className="ms-auto h-5 w-5 shrink-0 text-fg-subtle" />
        </div>
      ))}
    </div>
  );
}
