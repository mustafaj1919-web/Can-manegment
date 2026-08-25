"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { LinkButton } from "@/components/ui/Button";
import { VEHICLES } from "@/lib/data/vehicles";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";
import { cn } from "@/lib/utils";

const SLIDES = VEHICLES.slice(0, 5);

const COPY = [
  { en: { title: "A driving experience on a new level", sub: "Advanced comfort and smart technology, performance you can trust." }, ar: { title: "تجربة قيادة بمستوى جديد", sub: "راحة متقدمة وتقنيات ذكية مع أداء يبعث على الثقة" } },
  { en: { title: "Power meets silence", sub: "Instant torque, zero emissions, everyday confidence." }, ar: { title: "القوة تلتقي بالهدوء" ,sub: "عزم فوري وانبعاثات صفرية وثقة يومية" } },
  { en: { title: "Engineered for real Iraqi roads", sub: "Built tough, tuned for comfort, backed by an 8-year battery warranty." }, ar: { title: "مصممة لتلائم شوارع العراق", sub: "متينة ومريحة ومدعومة بضمان بطارية 8 سنوات" } },
  { en: { title: "Space for everything that matters", sub: "Room for the whole family without compromising on style." }, ar: { title: "مساحة لكل ما يهم", sub: "تتسع للعائلة بأكملها دون التنازل عن الأناقة" } },
  { en: { title: "Precision in every detail", sub: "Sport-tuned dynamics wrapped in a refined, minimal cabin." }, ar: { title: "الدقة في كل تفصيل", sub: "أداء رياضي مضبوط داخل مقصورة أنيقة وبسيطة" } },
];

// Background video for the hero. Drop your file at public/videos/hero.mp4
// (and optionally public/videos/hero.webm + public/videos/hero-poster.jpg).
// If the file isn't there yet, the animated vehicle scene is shown instead
// so the page never breaks.
const HERO_VIDEO_MP4 = "/videos/hero.mp4";
const HERO_VIDEO_WEBM = "/videos/hero.webm";
const HERO_POSTER = "/videos/hero-poster.jpg";

export default function Hero() {
  const { locale, dict } = useI18n();
  const [index, setIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const vehicle = SLIDES[index];
  const copy = locale === "ar" ? COPY[index].ar : COPY[index].en;

  return (
    <section className="relative flex h-[100svh] min-h-[640px] items-end overflow-hidden bg-carbon">
      {/* Background: video if available, otherwise the rotating studio scene */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 65% 40%, #2a3648 0%, #131a24 55%, #05070d 100%)" }}
        />

        {!videoFailed && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={HERO_POSTER}
            onError={() => setVideoFailed(true)}
          >
            <source src={HERO_VIDEO_WEBM} type="video/webm" />
            <source src={HERO_VIDEO_MP4} type="video/mp4" />
          </video>
        )}

        {videoFailed && (
          <AnimatePresence mode="wait">
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <VehicleStudioRender
                category={vehicle.category}
                accent="#7d92ad"
                angle="three-quarter"
                className="absolute inset-0 h-full w-full scale-125 opacity-95"
              />
            </motion.div>
          </AnimatePresence>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/70 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="container-premium relative pb-16 pt-32 sm:pb-20 md:pb-24">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-balance text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-md text-base text-white/70 sm:text-lg">{copy.sub}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href={`/vehicles/${vehicle.slug}`} variant="secondary" size="md">
              {locale === "ar" ? "جربها الآن" : "Try it now"}
            </LinkButton>
            <LinkButton href="/vehicles" variant="glass" size="md" className="border-white/20 text-white">
              {dict.cta.exploreVehicles}
            </LinkButton>
          </div>
        </div>

        {/* Slide indicators (cycle the messaging above) */}
        <div className="mt-12 flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === index ? "w-8 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
