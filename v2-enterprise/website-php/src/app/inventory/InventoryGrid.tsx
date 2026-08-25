"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ArrowUpRight, Search, X, Car, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n/context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehiclePhoto {
  id: string;
  filename: string;
  subfolder: string;
}

interface InventoryVehicle {
  id: string;
  brand: string;
  model: string;
  manufacturing_year: number;
  color: string;
  selling_price: number | null;
  status: string;
  created_at: string;
  photos: VehiclePhoto[];
  cover_photo: VehiclePhoto | null;
}

interface InventoryPage {
  total: number;
  page: number;
  per_page: number;
  items: InventoryVehicle[];
}

const imgUrl = (f: string) => `/api/inventory/images?f=${encodeURIComponent(f)}`;

function formatIQD(n: number) {
  return new Intl.NumberFormat("ar-IQ", { style: "currency", currency: "IQD", maximumFractionDigits: 0 }).format(n);
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const dur = 1200;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(value * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <span ref={ref}>{val}</span>;
}

// ─── Cinematic Hero ───────────────────────────────────────────────────────────

function InventoryHero({
  total,
  query,
  setQuery,
}: {
  total: number | null;
  query: string;
  setQuery: (q: string) => void;
}) {
  const { locale } = useI18n();

  return (
    <section className="relative overflow-hidden bg-[#05070d] pt-36 pb-16 md:pt-44">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-primary/8 absolute start-1/2 -top-40 h-[500px] w-[700px] -translate-x-1/2 rounded-full blur-[120px]" />
        <div className="absolute end-10 top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-[80px]" />
      </div>

      {/* Scan-line texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)",
          backgroundSize: "100% 3px",
        }}
      />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-5 flex items-center gap-2.5">
            <span className="bg-primary h-px w-8" />
            <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
              {locale === "ar" ? "المخزون المتاح" : "Available Stock"}
            </span>
          </div>

          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            {total !== null ? (
              <>
                <Counter value={total} />{" "}
                <span className="text-gradient-primary">{locale === "ar" ? "سيارة" : "Cars"}</span>
              </>
            ) : (
              <span className="text-gradient-primary">{locale === "ar" ? "المخزون" : "Inventory"}</span>
            )}
          </h1>

          <p className="mt-4 max-w-lg text-base text-white/50">
            {locale === "ar"
              ? "جميع السيارات المعروضة جاهزة للبيع الفوري في معرضنا."
              : "Every vehicle listed is in our showroom, ready for immediate purchase."}
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 max-w-xl"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute start-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === "ar" ? "ابحث بالموديل أو اللون أو السنة..." : "Search model, color, or year…"}
              className="focus:border-primary/50 h-14 w-full rounded-2xl border border-white/10 bg-white/5 ps-12 pe-12 text-sm text-white placeholder-white/30 backdrop-blur-sm transition-all outline-none focus:bg-white/8"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute end-5 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

// ─── Cinematic Vehicle Card ───────────────────────────────────────────────────

function VehicleCard({ vehicle, index }: { vehicle: InventoryVehicle; index: number }) {
  const { locale } = useI18n();
  const [imgErr, setImgErr] = useState(false);
  const photo = vehicle.cover_photo ?? vehicle.photos[0] ?? null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.07, 0.42), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/inventory/${vehicle.id}`}
        className="group hover:border-primary/25 relative block overflow-hidden rounded-3xl border border-white/5 bg-[#0a0e18] transition-all duration-500 hover:shadow-[0_32px_80px_-20px_rgba(37,99,235,0.28)]"
      >
        {/* Photo */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#10141f]">
          {photo && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl(photo.filename)}
              alt={`${vehicle.brand} ${vehicle.model}`}
              onError={() => setImgErr(true)}
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Car className="h-16 w-16 text-white/5" />
            </div>
          )}

          {/* Permanent subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {/* Year badge */}
          <span className="absolute end-3 top-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
            {vehicle.manufacturing_year}
          </span>

          {/* Hover: floating "View" pill */}
          <div className="absolute inset-x-0 bottom-4 flex translate-y-4 justify-center opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-bold text-white backdrop-blur-md">
              {locale === "ar" ? "عرض التفاصيل" : "View Details"}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <p className="text-primary/80 text-[0.65rem] font-black tracking-[0.2em] uppercase">{vehicle.brand}</p>
          <h3 className="mt-1 text-lg font-extrabold tracking-tight text-white">{vehicle.model}</h3>

          {vehicle.color && <p className="mt-1.5 text-xs font-medium text-white/40">{vehicle.color}</p>}

          <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
            {vehicle.selling_price ? (
              <p className="text-base font-black text-white tabular-nums" dir="ltr">
                {formatIQD(vehicle.selling_price)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-white/35">
                {locale === "ar" ? "السعر عند الطلب" : "Price on request"}
              </p>
            )}

            <span className="group-hover:border-primary group-hover:bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/50 transition-all duration-300 group-hover:text-white">
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  const { locale } = useI18n();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-28 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/8 bg-white/3">
        <Car className="h-9 w-9 text-white/20" />
      </div>
      <p className="text-xl font-extrabold text-white">{locale === "ar" ? "لا توجد سيارات" : "No vehicles found"}</p>
      {query && (
        <p className="mt-2 text-sm text-white/40">
          {locale === "ar" ? `لا نتائج لـ "${query}"` : `No results for "${query}"`}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton({ i }: { i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 0.05 }}
      className="overflow-hidden rounded-3xl border border-white/5 bg-[#0a0e18]"
    >
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-2.5 w-16 rounded-full" />
        <div className="skeleton h-5 w-40 rounded-full" />
        <div className="skeleton h-2.5 w-24 rounded-full" />
        <div className="mt-4 h-px bg-white/5" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-4 w-32 rounded-full" />
          <div className="skeleton h-9 w-9 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  const { locale } = useI18n();
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-12">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="hover:border-primary hover:text-primary flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/60 transition-all disabled:opacity-25"
      >
        {locale === "ar" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
      <span className="px-6 text-sm font-bold text-white/40">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="hover:border-primary hover:text-primary flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/60 transition-all disabled:opacity-25"
      >
        {locale === "ar" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PER_PAGE = 18;

export default function InventoryGrid() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InventoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { locale } = useI18n();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
      });
      const res = await fetch(`/api/inventory?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data as InventoryPage);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#05070d]">
      {/* Cinematic hero with search */}
      <InventoryHero total={data?.total ?? null} query={query} setQuery={setQuery} />

      {/* Grid section */}
      <div className="pb-24">
        <Container className="pt-12">
          {/* Result count + filter hint */}
          {data && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 flex items-center justify-between"
            >
              <p className="text-sm font-semibold text-white/35">
                {debouncedQuery
                  ? locale === "ar"
                    ? `${data.total} نتيجة لـ "${debouncedQuery}"`
                    : `${data.total} results for "${debouncedQuery}"`
                  : locale === "ar"
                    ? `${data.total} سيارة متاحة`
                    : `${data.total} vehicles available`}
              </p>
              {debouncedQuery && (
                <button
                  onClick={() => setQuery("")}
                  className="text-primary hover:text-primary-light flex items-center gap-1.5 text-xs font-semibold transition-colors"
                >
                  <X className="h-3 w-3" />
                  {locale === "ar" ? "مسح البحث" : "Clear search"}
                </button>
              )}
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-8 text-center text-sm text-red-400">
              {locale === "ar" ? "تعذّر تحميل المخزون." : "Failed to load inventory."}
            </div>
          )}

          {/* Skeletons */}
          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} i={i} />
              ))}
            </div>
          )}

          {/* Cards */}
          {!loading && !error && data && (
            <>
              {data.items.length === 0 ? (
                <EmptyState query={debouncedQuery} />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={`${debouncedQuery}-${page}`} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {data.items.map((v, i) => (
                      <VehicleCard key={v.id} vehicle={v} index={i} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}

              <Pagination page={data.page} total={data.total} perPage={data.per_page} onChange={handlePageChange} />
            </>
          )}
        </Container>
      </div>
    </div>
  );
}
