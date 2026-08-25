"use client";

import { FileText, IdCard, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const REQUIREMENTS = [
  { icon: IdCard, en: "Valid national ID or residency card", ar: "هوية وطنية سارية أو بطاقة سكن" },
  { icon: Wallet, en: "Proof of income or employment letter", ar: "إثبات دخل أو كتاب تأييد وظيفي" },
  { icon: FileText, en: "Completed application form (below)", ar: "استمارة الطلب معبأة (أدناه)" },
];

export default function Requirements() {
  const { locale } = useI18n();
  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
        {locale === "ar" ? "المتطلبات" : "Requirements"}
      </p>
      {REQUIREMENTS.map((r) => (
        <div key={r.en} className="card-elevated flex items-center gap-4 rounded-2xl p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <r.icon className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-fg-muted">{locale === "ar" ? r.ar : r.en}</p>
        </div>
      ))}
    </div>
  );
}
