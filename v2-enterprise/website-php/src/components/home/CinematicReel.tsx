"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { Play, ChevronRight, Check, X, Maximize2, Mountain, Gauge, Leaf, Car, Star, Award, Zap } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { Container } from "@/components/ui/Container";
import { ParticleCanvas } from "@/components/ui/ParticleCanvas";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/data/locations";

// ─── Data ─────────────────────────────────────────────────────────────────────

const REEL = [
  {
    id: "land-cruiser",
    brand: "Toyota",
    model: "Land Cruiser",
    year: 2024,
    youtubeId: "6KwTDQde5jQ",
    accent: "#16a34a",
    tagline: { ar: "الأسطورة تعود", en: "The Legend Returns" },
    specs: [
      { icon: Mountain, ar: "دفع رباعي كامل", en: "Full 4WD" },
      { icon: Leaf, ar: "هجين كهربائي موفر", en: "Hybrid Electric" },
      { icon: Check, ar: "فحص شامل معتمد", en: "Certified Inspection" },
    ],
    badge: { ar: "الأكثر طلباً", en: "Most Requested" },
  },
  {
    id: "camry",
    brand: "Toyota",
    model: "Camry",
    year: 2024,
    youtubeId: "KHTGMEoc3hQ",
    accent: "#2563eb",
    tagline: { ar: "سيدان يغيّر القواعد", en: "The Game-Changing Sedan" },
    specs: [
      { icon: Gauge, ar: "أداء هجين استثنائي", en: "Exceptional Hybrid Performance" },
      { icon: Star, ar: "الأكثر مبيعاً ٢١ عاماً", en: "21-Year #1 Bestseller" },
      { icon: Car, ar: "راحة درجة أولى", en: "First-Class Comfort" },
    ],
    badge: { ar: "الأكثر مبيعاً", en: "Best Seller" },
  },
  {
    id: "e200",
    brand: "Mercedes‑Benz",
    model: "E 200",
    year: 2024,
    youtubeId: "dhEzXhQnoYQ",
    accent: "#c19f4a",
    tagline: { ar: "رقي بلا حدود", en: "Unmatched Refinement" },
    specs: [
      { icon: Award, ar: "تقنية MBUX المتقدمة", en: "Advanced MBUX Technology" },
      { icon: Zap, ar: "نظام هجين خفيف", en: "Mild Hybrid System" },
      { icon: Star, ar: "درجة تنفيذية ألمانية", en: "German Executive Class" },
    ],
    badge: { ar: "فئة تنفيذية", en: "Executive" },
  },
];

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimCount({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dur = 1400;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(ease * to) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        tick();
        obs.disconnect();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

// ─── Cinematic video frame ────────────────────────────────────────────────────

function VideoFrame({ item }: { item: (typeof REEL)[number] }) {
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${item.youtubeId}/maxresdefault.jpg`;

  // Reset on item change
  useEffect(() => {
    setPlaying(false);
  }, [item.youtubeId]);

  return (
    <>
      <div className="group relative aspect-video w-full overflow-hidden rounded-2xl">
        {/* Corner brackets */}
        {["tl", "tr", "bl", "br"].map((c) => (
          <div
            key={c}
            className="pointer-events-none absolute z-20 h-7 w-7"
            style={{
              top: c.startsWith("t") ? 0 : "auto",
              bottom: c.startsWith("b") ? 0 : "auto",
              left: c.endsWith("l") ? 0 : "auto",
              right: c.endsWith("r") ? 0 : "auto",
              borderTop: c.startsWith("t") ? `2px solid ${item.accent}` : undefined,
              borderBottom: c.startsWith("b") ? `2px solid ${item.accent}` : undefined,
              borderLeft: c.endsWith("l") ? `2px solid ${item.accent}` : undefined,
              borderRight: c.endsWith("r") ? `2px solid ${item.accent}` : undefined,
            }}
          />
        ))}

        {/* Glow border */}
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{ boxShadow: `inset 0 0 60px ${item.accent}18, 0 0 50px ${item.accent}18` }}
        />

        {/* Scan line */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-10 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${item.accent}60, transparent)` }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        <AnimatePresence mode="wait">
          {!playing ? (
            <motion.div
              key="thumb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

              {/* Play button */}
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center"
                aria-label="Play video"
              >
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <motion.span
                    className="absolute h-24 w-24 rounded-full"
                    style={{ border: `1px solid ${item.accent}50` }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                  <motion.span
                    className="absolute h-20 w-20 rounded-full"
                    style={{ border: `1px solid ${item.accent}40` }}
                    animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 shadow-2xl backdrop-blur-md"
                    style={{ background: `${item.accent}cc` }}
                  >
                    <Play className="ms-1 h-7 w-7 fill-current text-white" />
                  </motion.div>
                </div>
              </button>

              {/* Fullscreen btn */}
              <button
                onClick={() => setFullscreen(true)}
                className="absolute end-3 bottom-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white/60 backdrop-blur-md transition-all hover:border-white/30 hover:text-white"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={() => setPlaying(false)}
                className="absolute end-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80 backdrop-blur-md transition hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
            onClick={() => setFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
            <button
              onClick={() => setFullscreen(false)}
              className="absolute end-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Horizontal ticker ────────────────────────────────────────────────────────

function Ticker() {
  const items = [
    "Toyota Land Cruiser 2024",
    "•",
    "Toyota Camry 2024",
    "•",
    "Mercedes-Benz E 200 2024",
    "•",
    "فحص شامل مضمون",
    "•",
    "استلام فوري",
    "•",
  ];
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] py-2.5">
      <motion.div
        className="flex gap-6 text-[0.65rem] font-bold tracking-widest whitespace-nowrap text-white/25 uppercase"
        animate={{ x: [0, "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CinematicReel() {
  const { locale } = useI18n();
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const yTitle = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const springY = useSpring(yTitle, { stiffness: 80, damping: 20 });

  const item = REEL[active];

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#030507] py-0">
      <ParticleCanvas count={60} color="147,197,253" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute start-1/4 -top-20 h-[500px] w-[700px] rounded-full blur-[180px]"
            style={{ background: `${item.accent}12` }}
          />
        </AnimatePresence>
        <div className="bg-primary/5 absolute end-0 bottom-0 h-64 w-64 rounded-full blur-[100px]" />
      </div>

      {/* Ticker */}
      <Ticker />

      <Container className="relative py-20">
        {/* Section header */}
        <motion.div style={{ y: springY }} className="mb-14 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-4 flex items-center gap-3"
          >
            <div className="to-primary h-px w-10 bg-gradient-to-r from-transparent" />
            <span className="text-primary/60 text-[0.6rem] font-black tracking-[0.28em] uppercase">
              {locale === "ar" ? "معرض الفيديو" : "Video Showcase"}
            </span>
            <div className="to-primary h-px w-10 bg-gradient-to-l from-transparent" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            {locale === "ar" ? (
              <>
                شاهد السيارة
                <br />
                <span style={{ color: item.accent }}>وهي تتحرك</span>
              </>
            ) : (
              <>
                Watch It
                <br />
                <span style={{ color: item.accent }}>In Motion</span>
              </>
            )}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="mt-3 max-w-lg text-sm text-white/35"
          >
            {locale === "ar"
              ? "مراجعات حقيقية ومقارنات أداء لكل طراز في معرضنا"
              : "Real reviews and performance tests for every model in our showroom"}
          </motion.p>
        </motion.div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          {/* ── Left: Video ── */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* NOW PLAYING */}
            <div className="mb-3 flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-[0.58rem] font-black tracking-[0.25em] text-white/35 uppercase">
                {locale === "ar" ? "يُعرض الآن" : "Now Playing"}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[0.55rem] font-black tracking-widest uppercase"
                style={{ background: `${item.accent}25`, color: item.accent }}
              >
                {locale === "ar" ? item.badge.ar : item.badge.en}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={item.youtubeId}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.55 }}
              >
                <VideoFrame item={item} />
              </motion.div>
            </AnimatePresence>

            {/* Vehicle selector tabs */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {REEL.map((r, i) => (
                <motion.button
                  key={r.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border px-3 py-3 text-center transition-all duration-400",
                    i === active
                      ? "shadow-lg"
                      : "border-white/[0.07] bg-white/[0.025] text-white/35 hover:border-white/15 hover:text-white/55",
                  )}
                  style={
                    i === active
                      ? {
                          borderColor: `${r.accent}60`,
                          background: `${r.accent}15`,
                          color: r.accent,
                          boxShadow: `0 8px 24px ${r.accent}20`,
                        }
                      : undefined
                  }
                >
                  {i === active && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(135deg, ${r.accent}10, transparent)` }}
                    />
                  )}
                  <div className="relative">
                    <div className="mb-0.5 text-[0.52rem] font-bold tracking-widest uppercase opacity-60">
                      {r.brand}
                    </div>
                    <div className="text-xs font-extrabold">{r.model}</div>
                    <div
                      className="mx-auto mt-1 h-0.5 rounded-full transition-all duration-300"
                      style={{ width: i === active ? "60%" : "0%", background: r.accent }}
                    />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Right: Info ── */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
              >
                {/* Brand & year */}
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-[0.6rem] font-black tracking-widest uppercase"
                    style={{ background: `${item.accent}20`, color: item.accent }}
                  >
                    {item.brand}
                  </span>
                  <span className="text-xs font-bold text-white/25">{item.year}</span>
                </div>

                {/* Model name */}
                <h3 className="text-5xl font-black tracking-tight text-white md:text-6xl">{item.model}</h3>

                {/* Tagline */}
                <p className="mt-2 text-lg font-medium" style={{ color: item.accent }}>
                  {locale === "ar" ? item.tagline.ar : item.tagline.en}
                </p>

                {/* Divider */}
                <div
                  className="my-6 h-px"
                  style={{ background: `linear-gradient(to end, ${item.accent}50, transparent)` }}
                />

                {/* Specs */}
                <ul className="space-y-4">
                  {item.specs.map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 + 0.1 }}
                      className="flex items-center gap-3.5"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${item.accent}15` }}
                      >
                        <s.icon className="h-4 w-4" style={{ color: item.accent }} />
                      </span>
                      <span className="text-sm font-semibold text-white/70">{locale === "ar" ? s.ar : s.en}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* Stats strip */}
                <div className="my-7 grid grid-cols-3 gap-3">
                  {[
                    { val: 4200, suf: "+", ar: "عميل", en: "Clients" },
                    { val: 98, suf: "%", ar: "رضا", en: "Satisfaction" },
                    { val: 12, suf: "", ar: "سنة خبرة", en: "Yrs Exp." },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center">
                      <p className="text-xl font-black text-white tabular-nums">
                        <AnimCount to={s.val} suffix={s.suf} />
                      </p>
                      <p className="mt-0.5 text-[0.6rem] font-bold text-white/35">{locale === "ar" ? s.ar : s.en}</p>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/inventory"
                    className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${item.accent}, ${item.accent}cc)`,
                      boxShadow: `0 8px 30px ${item.accent}40`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${item.accent}60`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${item.accent}40`;
                    }}
                  >
                    {locale === "ar" ? "عرض في المخزون" : "View in Stock"}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </Link>

                  <a
                    href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
                      locale === "ar"
                        ? `مرحباً، أريد الاستفسار عن ${item.brand} ${item.model} ${item.year}`
                        : `Hi, I want to inquire about ${item.brand} ${item.model} ${item.year}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3.5 text-sm font-bold text-emerald-400 transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/15"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {locale === "ar" ? "استفسر الآن" : "Inquire Now"}
                  </a>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── Bottom stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { n: 3, suf: "", ar: "طرازات جاهزة الآن", en: "Models Ready Now" },
            { n: 4200, suf: "+", ar: "سيارة تم تسليمها", en: "Vehicles Delivered" },
            { n: 98, suf: "%", ar: "نسبة رضا العملاء", en: "Customer Satisfaction" },
            { n: 12, suf: "", ar: "سنة في خدمتكم", en: "Years in Service" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 + 0.2 }}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-5 text-center backdrop-blur-sm"
            >
              <p className="text-3xl font-black text-white tabular-nums sm:text-4xl">
                <AnimCount to={s.n} suffix={s.suf} />
              </p>
              <p className="mt-1.5 text-xs font-semibold text-white/35">{locale === "ar" ? s.ar : s.en}</p>
            </motion.div>
          ))}
        </motion.div>
      </Container>

      <Ticker />
    </section>
  );
}
