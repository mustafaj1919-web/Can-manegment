"use client";

import { MapPin, Clock, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LOCATIONS } from "@/lib/data/locations";

export default function LocationsMini() {
  const { locale } = useI18n();

  return (
    <div className="space-y-4">
      {LOCATIONS.map((l) => (
        <div key={l.id} className="card-elevated rounded-2xl p-5">
          <p className="text-sm font-extrabold">{locale === "ar" ? l.nameAr : l.nameEn}</p>
          <div className="mt-3 space-y-2 text-sm text-fg-muted">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {locale === "ar" ? l.addressAr : l.addressEn}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" /> {locale === "ar" ? l.hoursAr : l.hoursEn}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" /> {l.phone}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
