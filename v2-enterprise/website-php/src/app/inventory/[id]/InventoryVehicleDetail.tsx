"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Fuel,
  Gauge,
  Calendar,
  Palette,
  Settings2,
  Users,
  Play,
  X,
  Share2,
  CheckCircle,
  Expand,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import LeadForm from "@/components/shared/LeadForm";
import { useI18n } from "@/lib/i18n/context";
import { BRAND } from "@/lib/data/locations";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehiclePhoto {
  id: string;
  filename: string;
  subfolder: string;
}

export interface VehicleData {
  id: string;
  brand: string;
  model: string;
  manufacturing_year: number;
  color: string | null;
  selling_price: number | null;
  status: string;
  transmission: string | null;
  fuel_type: string | null;
  engine_size: string | null;
  mileage: number | null;
  seat_count: number | null;
  condition: string;
  notes: string | null;
  photos: VehiclePhoto[];
  plate_number?: string;
  import_country?: string;
  seat_material?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const imgUrl = (f: string) => `/api/inventory/images?f=${encodeURIComponent(f)}`;

function formatIQD(n: number) {
  return new Intl.NumberFormat("ar-IQ", { style: "currency", currency: "IQD", maximumFractionDigits: 0 }).format(n);
}

// YouTube lookup table — add model names here as inventory grows
const YOUTUBE_IDS: Record<string, string> = {
  // BYD
  "atto 3": "dXMUBi6EvE8",
  atto3: "dXMUBi6EvE8",
  han: "FmE9JrLWBuI",
  seal: "C2YnkPvxO2c",
  dolphin: "K8yGHnKJBrc",
  tang: "uZUTkORY9lk",
  "song plus": "W5TJ0frHYJk",
  "song pro": "6Hs3GS4oMbQ",
  "qin plus": "r6tPfFrJqoE",
  // Mercedes-Benz
  "e 200": "dhEzXhQnoYQ",
  e200: "dhEzXhQnoYQ",
  "e-class": "dhEzXhQnoYQ",
  "c 200": "6VRkRF3fvGw",
  c200: "6VRkRF3fvGw",
  "s 500": "EgSp-oqRWCY",
  s500: "EgSp-oqRWCY",
  glc: "T2LbzCdi5AU",
  gle: "MoFZhjIYkVs",
  // Toyota
  "land cruiser": "6KwTDQde5jQ",
  landcruiser: "6KwTDQde5jQ",
  camry: "KHTGMEoc3hQ",
  corolla: "ue8FEUIKWW0",
  hilux: "RDcOOoDqcto",
  rav4: "zjL7A_eTpKk",
  prado: "TE6cV4VaMSE",
};

function resolveYouTubeId(brand: string, model: string): string | null {
  const haystack = `${brand} ${model}`.toLowerCase().trim();
  for (const [k, v] of Object.entries(YOUTUBE_IDS)) {
    if (haystack.includes(k)) return v;
  }
  return null;
}

// ─── Animated Price ───────────────────────────────────────────────────────────

function AnimatedPrice({ price }: { price: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const dur = 1400;
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(price * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, price]);

  return (
    <p ref={ref} className="text-primary text-3xl font-black tabular-nums" dir="ltr">
      {formatIQD(val)}
    </p>
  );
}

// ─── Photo Carousel (Embla) ───────────────────────────────────────────────────

function PhotoCarousel({ photos }: { photos: VehiclePhoto[] }) {
  const autoplay = useRef(Autoplay({ delay: 4500, stopOnInteraction: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false }, [autoplay.current]);
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (photos.length === 0) {
    return (
      <div className="bg-bg-muted flex aspect-video w-full items-center justify-center rounded-3xl">
        <Car className="text-fg h-20 w-20 opacity-10" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-muted relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Main reel */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {photos.map((p, i) => (
              <div key={p.id} className="relative aspect-video min-w-0 flex-[0_0_100%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl(p.filename)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
                {/* Gradient overlay bottom */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </div>

        {/* Prev / Next */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute start-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute end-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selected ? "w-8 bg-white" : "w-1.5 bg-white/40",
                )}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setLightbox(imgUrl(photos[selected].filename))}
          className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60"
          aria-label="Full screen"
        >
          <Expand className="h-4 w-4" />
        </button>

        {/* Photo count */}
        <span className="absolute start-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
          {selected + 1} / {photos.length}
        </span>
      </div>

      {/* Thumbnails strip */}
      {photos.length > 1 && (
        <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200",
                i === selected
                  ? "border-primary scale-105 opacity-100 shadow-lg"
                  : "border-transparent opacity-50 hover:opacity-80",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(p.filename)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute end-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              src={lightbox}
              alt=""
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[90vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── YouTube Video Section ─────────────────────────────────────────────────────

function VideoSection({ youtubeId, brand, model }: { youtubeId: string | null; brand: string; model: string }) {
  const { locale } = useI18n();
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (!youtubeId) {
    return (
      <motion.section
        ref={ref}
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="from-bg-elevated to-bg-muted border-border relative overflow-hidden rounded-3xl border bg-gradient-to-br p-10 text-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
            <Play className="h-7 w-7 fill-current" />
          </div>
          <p className="text-lg font-extrabold">{locale === "ar" ? "جولة الفيديو قادمة" : "Video Tour Coming Soon"}</p>
          <p className="text-fg-subtle max-w-xs text-sm">
            {locale === "ar"
              ? `سيتم إضافة فيديو استعراضي لـ ${brand} ${model} قريباً.`
              : `A walkthrough video for ${brand} ${model} will be available soon.`}
          </p>
        </div>
      </motion.section>
    );
  }

  const thumbUrl = `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-black shadow-2xl"
    >
      <h2 className="absolute start-5 top-5 z-10 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-xs font-bold tracking-widest text-white uppercase backdrop-blur-md">
        {locale === "ar" ? "جولة فيديو" : "Video Tour"}
      </h2>

      <AnimatePresence mode="wait">
        {!playing ? (
          <motion.div
            key="thumb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="group relative aspect-video cursor-pointer"
            onClick={() => setPlaying(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.96 }}
                className="bg-primary flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 shadow-[0_0_60px_rgba(37,99,235,0.6)]"
              >
                <Play className="ms-1 h-8 w-8 fill-white text-white" />
              </motion.div>
              <p className="text-sm font-bold tracking-wide text-white drop-shadow">
                {locale === "ar" ? `شاهد ${brand} ${model}` : `Watch ${brand} ${model}`}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${brand} ${model} video`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ─── Specs Grid ───────────────────────────────────────────────────────────────

function SpecCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: { en: string; ar: string };
  value: string;
  delay: number;
}) {
  const { locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="border-border bg-bg-elevated hover:border-primary/30 flex items-start gap-4 rounded-2xl border p-5 transition-all duration-300 hover:shadow-md"
    >
      <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-fg-subtle text-xs font-bold tracking-widest uppercase">
          {locale === "ar" ? label.ar : label.en}
        </p>
        <p className="mt-1 text-base font-extrabold">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────────────

function ShareButton({ brand, model }: { brand: string; model: string }) {
  const [copied, setCopied] = useState(false);
  const { locale } = useI18n();

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${brand} ${model}`, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="border-border hover:border-primary hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
      aria-label={locale === "ar" ? "مشاركة" : "Share"}
    >
      {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────

function TrustBadges() {
  const { locale } = useI18n();
  const badges = [
    { icon: <Shield className="h-4 w-4" />, en: "Verified Stock", ar: "مخزون موثّق" },
    { icon: <Star className="h-4 w-4" />, en: "Inspected", ar: "تم الفحص" },
    { icon: <Zap className="h-4 w-4" />, en: "Ready Now", ar: "جاهز فوراً" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span
          key={b.en}
          className="border-border bg-bg-subtle text-fg-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
        >
          <span className="text-primary">{b.icon}</span>
          {locale === "ar" ? b.ar : b.en}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InventoryVehicleDetail({ vehicle }: { vehicle: VehicleData }) {
  const { locale } = useI18n();
  const youtubeId = resolveYouTubeId(vehicle.brand, vehicle.model);

  type SpecItem = { icon: React.ReactNode; label: { en: string; ar: string }; value: string };
  const specItems: SpecItem[] = [
    [<Calendar key="y" className="h-4 w-4" />, { en: "Year", ar: "سنة الصنع" }, String(vehicle.manufacturing_year)],
    [<Palette key="c" className="h-4 w-4" />, { en: "Color", ar: "اللون" }, vehicle.color],
    [<Settings2 key="t" className="h-4 w-4" />, { en: "Transmission", ar: "ناقل الحركة" }, vehicle.transmission],
    [<Fuel key="f" className="h-4 w-4" />, { en: "Fuel Type", ar: "نوع الوقود" }, vehicle.fuel_type],
    [<Gauge key="e" className="h-4 w-4" />, { en: "Engine", ar: "المحرك" }, vehicle.engine_size],
    [
      <Users key="s" className="h-4 w-4" />,
      { en: "Seats", ar: "المقاعد" },
      vehicle.seat_count ? `${vehicle.seat_count}` : null,
    ],
    [
      <Gauge key="m" className="h-4 w-4" />,
      { en: "Mileage", ar: "المسافة المقطوعة" },
      vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : null,
    ],
    [<Car key="cd" className="h-4 w-4" />, { en: "Condition", ar: "الحالة" }, vehicle.condition],
    [
      <Settings2 key="sm" className="h-4 w-4" />,
      { en: "Seat Material", ar: "مادة المقاعد" },
      vehicle.seat_material ?? null,
    ],
    [
      <Car key="ic" className="h-4 w-4" />,
      { en: "Import Country", ar: "بلد الاستيراد" },
      vehicle.import_country ?? null,
    ],
  ]
    .filter(([, , v]) => !!v)
    .map(([icon, label, value]) => ({ icon, label, value: value as string }) as SpecItem);

  return (
    <div className="pb-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
          {/* ── Left Column ── */}
          <div className="min-w-0 space-y-8">
            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <PhotoCarousel photos={vehicle.photos} />
            </motion.div>

            {/* Title + badges */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-primary text-sm font-bold tracking-widest uppercase">{vehicle.brand}</p>
                  <h1 className="text-3xl font-black tracking-tight md:text-4xl">{vehicle.model}</h1>
                  <p className="text-fg-muted mt-1 font-semibold">{vehicle.manufacturing_year}</p>
                </div>
                <ShareButton brand={vehicle.brand} model={vehicle.model} />
              </div>
              <TrustBadges />
            </motion.div>

            {/* Video */}
            <VideoSection youtubeId={youtubeId} brand={vehicle.brand} model={vehicle.model} />

            {/* Specs grid */}
            {specItems.length > 0 && (
              <section>
                <motion.h2
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="text-fg-subtle mb-5 text-xs font-bold tracking-widest uppercase"
                >
                  {locale === "ar" ? "المواصفات الكاملة" : "Full Specifications"}
                </motion.h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {specItems.map((s, i) => (
                    <SpecCard key={s.label.en} icon={s.icon} label={s.label} value={s.value} delay={i * 0.05} />
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            {vehicle.notes && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="border-border bg-bg-elevated rounded-2xl border p-6"
              >
                <h2 className="text-fg-subtle mb-3 text-xs font-bold tracking-widest uppercase">
                  {locale === "ar" ? "ملاحظات البائع" : "Seller Notes"}
                </h2>
                <p className="text-fg-muted text-sm leading-relaxed">{vehicle.notes}</p>
              </motion.section>
            )}
          </div>

          {/* ── Right Column (Sticky) ── */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Price card */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="border-border bg-bg-elevated relative overflow-hidden rounded-3xl border p-6 shadow-xl"
            >
              {/* Gradient accent top-right */}
              <div className="bg-primary/10 pointer-events-none absolute -end-16 -top-16 h-40 w-40 rounded-full blur-3xl" />

              <div className="relative space-y-5">
                <div>
                  <p className="text-fg-subtle mb-2 text-xs font-bold tracking-widest uppercase">
                    {locale === "ar" ? "سعر البيع" : "Selling Price"}
                  </p>
                  {vehicle.selling_price ? (
                    <AnimatedPrice price={vehicle.selling_price} />
                  ) : (
                    <p className="text-fg-muted text-xl font-bold">
                      {locale === "ar" ? "السعر عند الطلب" : "Price on request"}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {locale === "ar" ? "متوفر في المعرض" : "Available in showroom"}
                  </span>
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col gap-2.5">
                  <a
                    href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(`أريد الاستفسار عن ${vehicle.brand} ${vehicle.model} ${vehicle.manufacturing_year}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {locale === "ar" ? "تواصل عبر واتساب" : "Chat on WhatsApp"}
                  </a>
                  <a
                    href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
                    className="border-border bg-bg hover:border-primary hover:text-primary flex items-center justify-center gap-2.5 rounded-2xl border py-3.5 text-sm font-bold transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {BRAND.phone}
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Inquiry form */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="border-border bg-bg-elevated rounded-3xl border p-6"
            >
              <h3 className="mb-1 text-lg font-extrabold">{locale === "ar" ? "أرسل استفساراً" : "Send an Inquiry"}</h3>
              <p className="text-fg-subtle mb-5 text-sm">
                {locale === "ar" ? "سيرد فريقنا خلال ساعات" : "Our team replies within hours"}
              </p>
              <LeadForm type="contact" showMessage submitLabel={locale === "ar" ? "إرسال الاستفسار" : "Send Inquiry"} />
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  );
}
