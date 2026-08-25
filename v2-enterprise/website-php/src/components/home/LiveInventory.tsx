"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Car, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";

interface VehiclePhoto { id: string; filename: string; subfolder: string; }
interface LiveVehicle {
  id: string; brand: string; model: string; manufacturing_year: number;
  color: string; selling_price: number | null;
  photos: VehiclePhoto[]; cover_photo: VehiclePhoto | null;
}

const imgUrl = (f: string) => `/api/inventory/images?f=${encodeURIComponent(f)}`;

function formatIQD(n: number) {
  return new Intl.NumberFormat("ar-IQ", { style: "currency", currency: "IQD", maximumFractionDigits: 0 }).format(n);
}

function LiveCard({ v, index }: { v: LiveVehicle; index: number }) {
  const { locale } = useI18n();
  const photo = v.cover_photo ?? v.photos[0] ?? null;
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/inventory/${v.id}`}
        className="group relative block overflow-hidden rounded-3xl border border-white/5 bg-[#0a0e18] transition-all duration-500 hover:border-primary/30 hover:shadow-[0_24px_60px_-16px_rgba(37,99,235,0.3)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#10141f]">
          {photo && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl(photo.filename)}
              alt=""
              onError={() => setImgErr(true)}
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Car className="h-14 w-14 text-white/5" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute end-3 top-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            {v.manufacturing_year}
          </span>
          <div className="absolute inset-x-0 bottom-4 flex justify-center translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              {locale === "ar" ? "عرض التفاصيل" : "View Details"}
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-primary/80">{v.brand}</p>
          <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-white">{v.model}</h3>
          <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
            {v.selling_price ? (
              <p className="text-sm font-black text-white tabular-nums" dir="ltr">{formatIQD(v.selling_price)}</p>
            ) : (
              <p className="text-xs text-white/35">{locale === "ar" ? "السعر عند الطلب" : "Price on request"}</p>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-white">
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LiveInventory() {
  const { locale } = useI18n();
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory?per_page=3")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setVehicles(d.data.items); setTotal(d.data.total); }
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && vehicles.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#05070d] py-24">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 start-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <Container className="relative">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="h-px w-6 bg-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {locale === "ar" ? "في المعرض الآن" : "In Showroom Now"}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {locale === "ar" ? (
                <>سيارات جاهزة <span className="text-gradient-primary">للاستلام الفوري</span></>
              ) : (
                <>Ready for <span className="text-gradient-primary">Immediate Pickup</span></>
              )}
            </h2>
            {total !== null && (
              <p className="mt-2 text-sm text-white/40">
                {locale === "ar" ? `${total} سيارة متاحة حالياً` : `${total} vehicles currently available`}
              </p>
            )}
          </Reveal>
          <Reveal delay={0.1}>
            <LinkButton href="/inventory" variant="outline" icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
              className="border-white/15 text-white hover:border-primary"
            >
              {locale === "ar" ? "عرض الكل" : "See All"}
            </LinkButton>
          </Reveal>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-white/5 bg-[#0a0e18]">
                <div className="aspect-[4/3] skeleton" />
                <div className="p-5 space-y-3">
                  <div className="h-2.5 w-14 rounded skeleton" />
                  <div className="h-5 w-36 rounded skeleton" />
                  <div className="h-4 w-28 rounded skeleton mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v, i) => <LiveCard key={v.id} v={v} index={i} />)}
          </div>
        )}
      </Container>
    </section>
  );
}
