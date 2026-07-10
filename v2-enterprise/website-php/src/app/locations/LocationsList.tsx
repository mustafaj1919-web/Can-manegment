"use client";

import { MapPin, Clock, Phone, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LOCATIONS } from "@/lib/data/locations";

export default function LocationsList() {
  const { locale } = useI18n();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {LOCATIONS.map((l) => (
        <div key={l.id} className="card-elevated overflow-hidden rounded-2xl">
          <div className="h-52">
            <iframe
              title={l.nameEn}
              src={`https://www.google.com/maps?q=${l.lat},${l.lng}&z=14&output=embed`}
              className="h-full w-full border-0 grayscale"
              loading="lazy"
            />
          </div>
          <div className="p-6">
            <p className="text-base font-extrabold">{locale === "ar" ? l.nameAr : l.nameEn}</p>
            <div className="mt-3 space-y-2 text-sm text-fg-muted">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {locale === "ar" ? l.addressAr : l.addressEn}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" /> {locale === "ar" ? l.hoursAr : l.hoursEn}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={`tel:${l.phone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border-strong py-2.5 text-xs font-bold transition hover:border-primary hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" /> {locale === "ar" ? "اتصل" : "Call"}
              </a>
              <a
                href={`https://wa.me/${l.whatsapp.replace(/\s|\+/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
