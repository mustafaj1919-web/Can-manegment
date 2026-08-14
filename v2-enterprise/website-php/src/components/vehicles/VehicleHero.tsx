"use client";

import { useState } from "react";
import Link from "next/link";
import type { Vehicle } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { LinkButton } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";

const ANGLES = ["three-quarter", "side"] as const;

/**
 * Cinematic vehicle-detail hero — dark stage, pill badges, a stacked
 * color-swatch "gallery" standing in for photography, and an overlapping
 * glass description card with a floating CTA (in the spirit of premium
 * car-configurator sites).
 */
export default function VehicleHero({ vehicle }: { vehicle: Vehicle }) {
  const { locale, dict } = useI18n();
  const [colorIndex, setColorIndex] = useState(0);
  const [angleIndex, setAngleIndex] = useState(0);
  const color = vehicle.colors[colorIndex];

  return (
    <section className="relative overflow-hidden bg-carbon">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 72% 25%, #232f42 0%, #10141f 55%, #05070d 100%)" }}
      />

      <div className="relative pb-8 pt-28 md:pt-32">
        <div className="container-premium">
          <nav className="flex items-center gap-1.5 text-xs text-white/40">
            <Link href="/" className="transition hover:text-white/70">
              {locale === "ar" ? "الرئيسية" : "Home"}
            </Link>
            <span>/</span>
            <Link href="/vehicles" className="transition hover:text-white/70">
              {dict.nav.vehicles}
            </Link>
            <span>/</span>
            <span className="font-semibold text-white/70">
              {locale === "ar" ? vehicle.nameAr : vehicle.nameEn}
            </span>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="glass rounded-full border border-white/15 px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
              {dict.common.startingAt} {formatCurrency(vehicle.priceUSD)}
            </span>
            <span className="rounded-full border border-white/15 px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white/70">
              {locale === "ar" ? vehicle.typeAr : vehicle.typeEn}
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {locale === "ar" ? vehicle.nameAr : vehicle.nameEn}
          </h1>
        </div>

        {/* Visual stage */}
        <div className="relative mt-6 h-[300px] sm:h-[400px] lg:h-[480px]">
          <VehicleStudioRender
            category={vehicle.category}
            accent={color.hex}
            angle={ANGLES[angleIndex]}
            className="absolute inset-0 h-full w-full scale-110"
          />

          {/* Stacked color/angle thumbnails — our stand-in for a photo gallery */}
          {vehicle.colors.length > 1 && (
            <div className="container-premium absolute inset-y-0 end-0 hidden flex-col justify-center gap-3 sm:flex">
              {vehicle.colors.slice(0, 3).map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => setColorIndex(i)}
                  aria-label={locale === "ar" ? c.nameAr : c.name}
                  className={cn(
                    "h-16 w-24 shrink-0 overflow-hidden rounded-xl border bg-carbon-2 transition sm:h-20 sm:w-28",
                    colorIndex === i ? "border-white/70" : "border-white/15 opacity-55 hover:opacity-100",
                  )}
                >
                  <VehicleStudioRender category={vehicle.category} accent={c.hex} angle="side" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Overlapping description card + floating CTA */}
        <div className="container-premium relative -mt-10 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
          <div className="glass max-w-lg rounded-2xl border border-white/10 p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">
              {locale === "ar" ? vehicle.descriptionAr : vehicle.descriptionEn}
            </p>
          </div>
          <LinkButton
            href={`/test-drive?vehicle=${vehicle.slug}`}
            variant="secondary"
            size="md"
            className="shrink-0"
          >
            {dict.cta.bookTestDrive}
          </LinkButton>
        </div>

        {/* Color + angle controls */}
        <div className="container-premium mt-6 flex flex-wrap items-center gap-2">
          {vehicle.colors.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setColorIndex(i)}
              aria-label={c.name}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition",
                colorIndex === i ? "scale-110 border-white" : "border-white/20",
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <span className="ms-1 text-xs font-semibold text-white/50">
            {locale === "ar" ? color.nameAr : color.name}
          </span>
          <button
            onClick={() => setAngleIndex((i) => (i + 1) % ANGLES.length)}
            className="ms-auto rounded-full border border-white/15 px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {locale === "ar" ? "تدوير العرض" : "Rotate View"}
          </button>
        </div>
      </div>
    </section>
  );
}
