"use client";

import Link from "next/link";
import { Tag, Calendar, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { OFFERS } from "@/lib/data/offers";
import { getVehicleBySlug, VEHICLES } from "@/lib/data/vehicles";
import { Reveal } from "@/components/ui/Reveal";

export default function OffersGrid() {
  const { locale } = useI18n();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {OFFERS.map((offer, i) => {
        const vehicle = VEHICLES.find((v) => v.id === offer.vehicleId) ?? getVehicleBySlug(offer.vehicleId);
        return (
          <Reveal key={offer.id} delay={i * 0.08}>
            <div className="card-elevated flex h-full flex-col rounded-2xl p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-bold uppercase text-primary">
                <Tag className="h-3 w-3" />
                {offer.badge}
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{locale === "ar" ? offer.titleAr : offer.titleEn}</h3>
              <p className="mt-2 flex-1 text-sm text-fg-muted">{locale === "ar" ? offer.descAr : offer.descEn}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
                <Calendar className="h-3.5 w-3.5" />
                {locale === "ar" ? "ينتهي في" : "Expires"}{" "}
                {new Date(offer.expiry).toLocaleDateString(locale === "ar" ? "ar-IQ" : "en-US", { month: "long", day: "numeric" })}
              </p>
              {vehicle && (
                <Link
                  href={`/vehicles/${vehicle.slug}`}
                  className="mt-5 flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  {locale === "ar" ? `عرض ${vehicle.nameAr}` : `View ${vehicle.nameEn}`}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              )}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
