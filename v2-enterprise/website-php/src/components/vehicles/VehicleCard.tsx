"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Battery, Gauge, Zap } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { formatCurrency } from "@/lib/utils";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";

const BADGE_LABEL: Record<string, { en: string; ar: string; className: string }> = {
  new: { en: "New", ar: "جديد", className: "bg-emerald-500 text-white" },
  "best-seller": { en: "Best Seller", ar: "الأكثر مبيعاً", className: "bg-primary text-white" },
  flagship: { en: "Flagship", ar: "الرائدة", className: "bg-fg text-bg" },
  value: { en: "Best Value", ar: "أفضل قيمة", className: "bg-amber-500 text-white" },
};

export default function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  const { locale, dict } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <Link
        href={`/vehicles/${vehicle.slug}`}
        className="card-elevated relative flex flex-col overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-20px_rgba(37,99,235,0.35)]"
      >
        <div className="relative h-56 bg-bg-muted">
          {vehicle.badges[0] && (
            <span
              className={`absolute start-4 top-4 z-10 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${BADGE_LABEL[vehicle.badges[0]].className}`}
            >
              {locale === "ar" ? BADGE_LABEL[vehicle.badges[0]].ar : BADGE_LABEL[vehicle.badges[0]].en}
            </span>
          )}
          <VehicleStudioRender
            category={vehicle.category}
            className="h-full w-full transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            {locale === "ar" ? vehicle.typeAr : vehicle.typeEn}
          </p>
          <h3 className="mt-1 text-lg font-extrabold tracking-tight">
            {locale === "ar" ? vehicle.nameAr : vehicle.nameEn}
          </h3>

          <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
            <Stat icon={<Zap className="h-3.5 w-3.5" />} value={`${vehicle.horsepower}`} label="HP" />
            <Stat icon={<Battery className="h-3.5 w-3.5" />} value={`${vehicle.rangeKM}`} label="KM" />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} value={vehicle.acceleration} label="0-100" />
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase text-fg-subtle">{dict.common.startingAt}</p>
              <p className="text-xl font-black text-primary">{formatCurrency(vehicle.priceUSD)}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-white">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-bold leading-none">{value}</span>
      <span className="text-[0.6rem] text-fg-subtle">{label}</span>
    </div>
  );
}
