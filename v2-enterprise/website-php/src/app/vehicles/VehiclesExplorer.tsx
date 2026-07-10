"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import VehicleCard from "@/components/vehicles/VehicleCard";
import { Container } from "@/components/ui/Container";
import { cn, formatCurrency } from "@/lib/utils";
import type { VehicleCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<VehicleCategory, { en: string; ar: string }> = {
  sedan: { en: "Sedan", ar: "سيدان" },
  suv: { en: "SUV", ar: "دفع رباعي" },
  hatchback: { en: "Hatchback", ar: "هاتشباك" },
  performance: { en: "Performance", ar: "أداء رياضي" },
};

const SORTS = [
  { key: "featured", en: "Featured", ar: "مميزة" },
  { key: "price-asc", en: "Price: Low to High", ar: "السعر: الأقل أولاً" },
  { key: "price-desc", en: "Price: High to Low", ar: "السعر: الأعلى أولاً" },
  { key: "range", en: "Longest Range", ar: "أطول مدى" },
] as const;

export default function VehiclesExplorer() {
  const { locale, dict } = useI18n();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get("category") as VehicleCategory | null) ?? null;

  const [category, setCategory] = useState<VehicleCategory | null>(initialCategory);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("featured");
  const [maxPrice, setMaxPrice] = useState(60000);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = Array.from(new Set(VEHICLES.map((v) => v.category))) as VehicleCategory[];

  const results = useMemo(() => {
    let list = VEHICLES.filter((v) => v.priceUSD <= maxPrice);
    if (category) list = list.filter((v) => v.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((v) => v.nameEn.toLowerCase().includes(q) || v.nameAr.includes(query) || v.typeEn.toLowerCase().includes(q));
    }
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.priceUSD - b.priceUSD);
      case "price-desc":
        return [...list].sort((a, b) => b.priceUSD - a.priceUSD);
      case "range":
        return [...list].sort((a, b) => b.rangeKM - a.rangeKM);
      default:
        return list;
    }
  }, [category, query, sort, maxPrice]);

  return (
    <Container>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters sidebar (desktop) */}
        <aside className="hidden lg:block">
          <FilterPanel
            categories={categories}
            category={category}
            setCategory={setCategory}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
          />
        </aside>

        <div>
          {/* Search + sort bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={locale === "ar" ? "ابحث عن طراز..." : "Search a model..."}
                className="h-12 w-full rounded-full border border-border-strong bg-bg ps-11 pe-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-12 rounded-full border border-border-strong bg-bg px-4 text-sm font-semibold outline-none focus:border-primary"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {locale === "ar" ? s.ar : s.en}
                </option>
              ))}
            </select>
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex h-12 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {locale === "ar" ? "فلترة" : "Filters"}
            </button>
          </div>

          <p className="mt-4 text-sm text-fg-subtle">
            {results.length} {locale === "ar" ? "نتيجة" : "results"}
          </p>

          {results.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} index={i} />
              ))}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="text-lg font-bold">{locale === "ar" ? "لا توجد نتائج مطابقة" : "No matching vehicles"}</p>
              <p className="mt-1 text-sm text-fg-subtle">
                {locale === "ar" ? "جرّب تعديل الفلاتر أو كلمة البحث." : "Try adjusting your filters or search term."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersOpen(false)} />
          <div className="relative w-full rounded-t-3xl bg-bg-elevated p-6 pb-10">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-extrabold">{locale === "ar" ? "الفلاتر" : "Filters"}</p>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel
              categories={categories}
              category={category}
              setCategory={setCategory}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
            />
            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-6 h-12 w-full rounded-full bg-primary text-sm font-bold text-white"
            >
              {dict.cta.seeAll} ({results.length})
            </button>
          </div>
        </div>
      )}
    </Container>
  );
}

function FilterPanel({
  categories,
  category,
  setCategory,
  maxPrice,
  setMaxPrice,
}: {
  categories: VehicleCategory[];
  category: VehicleCategory | null;
  setCategory: (c: VehicleCategory | null) => void;
  maxPrice: number;
  setMaxPrice: (n: number) => void;
}) {
  const { locale } = useI18n();
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
          {locale === "ar" ? "التصنيف" : "Category"}
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-lg px-3 py-2 text-start text-sm font-semibold transition",
              !category ? "bg-primary text-white" : "text-fg-muted hover:bg-bg-muted",
            )}
          >
            {locale === "ar" ? "الكل" : "All"}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-lg px-3 py-2 text-start text-sm font-semibold transition",
                category === c ? "bg-primary text-white" : "text-fg-muted hover:bg-bg-muted",
              )}
            >
              {locale === "ar" ? CATEGORY_LABELS[c].ar : CATEGORY_LABELS[c].en}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
            {locale === "ar" ? "الحد الأقصى للسعر" : "Max Price"}
          </p>
          <span className="text-sm font-extrabold text-primary">{formatCurrency(maxPrice)}</span>
        </div>
        <input
          type="range"
          min={14000}
          max={55000}
          step={1000}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-bg-muted accent-primary"
        />
      </div>
    </div>
  );
}
