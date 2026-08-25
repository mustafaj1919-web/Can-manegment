"use client";

import { useState } from "react";
import { RotateCw, Download, MessageCircle } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";
import { BRAND } from "@/lib/data/locations";
import { cn } from "@/lib/utils";

const ANGLES = ["side", "three-quarter"] as const;

export default function VehicleViewer({ vehicle }: { vehicle: Vehicle }) {
  const { locale, dict } = useI18n();
  const [angleIndex, setAngleIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const color = vehicle.colors[colorIndex];

  return (
    <div className="card-elevated overflow-hidden rounded-3xl">
      <div className="relative h-[340px] bg-bg-muted sm:h-[420px]">
        <VehicleStudioRender
          category={vehicle.category}
          accent={color.hex}
          angle={ANGLES[angleIndex]}
          className="h-full w-full"
        />
        <button
          onClick={() => setAngleIndex((i) => (i + 1) % ANGLES.length)}
          className="glass absolute bottom-4 end-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
        >
          <RotateCw className="h-3.5 w-3.5" />
          {locale === "ar" ? "تدوير العرض" : "Rotate View"}
        </button>
        <span className="glass absolute start-4 top-4 rounded-full px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide">
          {locale === "ar" ? "عرض استوديو تفاعلي" : "Interactive Studio View"}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-5">
        <div className="flex items-center gap-2">
          {vehicle.colors.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setColorIndex(i)}
              aria-label={c.name}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition",
                colorIndex === i ? "border-primary scale-110" : "border-transparent",
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <span className="ms-2 text-xs font-semibold text-fg-muted">
            {locale === "ar" ? color.nameAr : color.name}
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 rounded-full border border-border-strong px-4 py-2 text-xs font-bold transition hover:border-primary hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" />
            {dict.cta.downloadBrochure}
          </a>
          <a
            href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
              (locale === "ar" ? "مرحباً، أرغب بمعرفة المزيد عن " : "Hi, I'd like to know more about the ") +
                (locale === "ar" ? vehicle.nameAr : vehicle.nameEn),
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
