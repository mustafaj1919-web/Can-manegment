"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export default function VehicleDetailTabs({ vehicle }: { vehicle: Vehicle }) {
  const { locale } = useI18n();
  const tabs = [
    { key: "specs", en: "Specifications", ar: "المواصفات" },
    { key: "features", en: "Features", ar: "المميزات" },
    { key: "safety", en: "Safety", ar: "الأمان" },
  ] as const;
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("specs");

  const specs = locale === "ar" ? vehicle.specsAr : vehicle.specsEn;
  const features = locale === "ar" ? vehicle.featuresAr : vehicle.featuresEn;
  const safety = locale === "ar" ? vehicle.safetyAr : vehicle.safetyEn;

  return (
    <div className="card-elevated rounded-3xl p-2">
      <div className="flex gap-1 border-b border-border p-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-bold transition",
              active === t.key ? "bg-primary text-white" : "text-fg-muted hover:bg-bg-muted",
            )}
          >
            {locale === "ar" ? t.ar : t.en}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        {active === "specs" && (
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {Object.entries(specs).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-border py-2.5 text-sm">
                <dt className="text-fg-subtle">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {active === "features" && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-fg-muted">{f}</span>
              </li>
            ))}
          </ul>
        )}

        {active === "safety" && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {safety.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-fg-muted">{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
