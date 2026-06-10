'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Car,
  Gauge,
  Settings,
  Fuel,
  Loader2,
  Search,
  Sparkles,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { getPublicCars, type Car as CarType, type CarsListResponse } from '@/lib/api/inventory'
import { formatMoney, formatNumber } from '@/lib/utils'

/* ── Label maps ── */
const FUEL_LABEL: Record<string, string> = { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' }
const TRANS_LABEL: Record<string, string> = { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' }

function carPhotoUrl(filename: string, subfolder = 'vehicles') {
  return `/static/uploads/${subfolder}/${filename}`
}

/* ── Helper: Calculate days in inventory ── */
function getDaysInInventory(createdAt: string | null) {
  if (!createdAt) return 'مضاف حديثاً'
  const createdDate = new Date(createdAt)
  const diffTime = Math.abs(new Date().getTime() - createdDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return 'اليوم'
  if (diffDays === 2) return 'أمس'
  if (diffDays <= 10) return `منذ ${diffDays} أيام`
  return `منذ ${diffDays} يوماً`
}

export default function PublicShowroomPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<CarsListResponse>({
    queryKey: ['public-cars', page, search],
    queryFn: () => getPublicCars({ page, per_page: 12, search }),
    placeholderData: (prev) => prev,
  })

  const cars = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 12)

  return (
    <div className="showroom-container" dir="rtl">
      {/* Top Welcome / Brand Header */}
      <header className="showroom-header">
        <div className="showroom-brand">
          <div className="brand-logo-container">
            <img src="/logo.png" alt="معرض الأصدقاء" className="showroom-logo" />
          </div>
          <div>
            <h1>شركة الأصدقاء لتجارة السيارات</h1>
            <p>صالة عرض الكتالوج الفخم المتاح للتسليم الفوري</p>
          </div>
        </div>
        <Link href="/login" className="admin-login-link">
          دخول الموظفين
        </Link>
      </header>

      {/* Hero Welcome Section */}
      <section className="showroom-hero">
        <div className="hero-glow-flare" />
        <div className="hero-content">
          <span className="hero-badge">
            <Sparkles className="h-3.5 w-3.5" /> فخامة الاختيار وموثوقية التعامل
          </span>
          <h2>استكشف أسطول سيارات الأصدقاء</h2>
          <p>تصفح مواصفات المركبات الفاخرة مباشرة وشاركها بلمسة واحدة</p>
        </div>

        {/* Search Input */}
        <div className="search-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="ابحث بالماركة، الموديل، أو المواصفات..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </section>

      {/* Cars Grid */}
      <main className="showroom-main">
        {isLoading ? (
          <div className="showroom-loading">
            <Loader2 className="showroom-spin" />
            <p>جاري تحميل الكتالوج الفاخر...</p>
          </div>
        ) : isError ? (
          <div className="showroom-error">
            <p>حدث خطأ أثناء تحميل الكتالوج. يرجى إعادة المحاولة.</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="showroom-empty">
            <Car className="empty-icon" />
            <h3>لا توجد سيارات مطابقة لبحثك</h3>
            <p>يرجى تجربة كلمة بحث أخرى أو مراجعة المعرض لاحقاً</p>
          </div>
        ) : (
          <>
            <div className="cars-grid">
              {cars.map((car: CarType) => {
                const cover = car.cover_photo
                const price = car.selling_price
                  ? formatMoney(car.selling_price, car.currency)
                  : 'يحدد عند الطلب'
                const carTitle = `${car.brand} ${car.model}`
                const daysInStock = getDaysInInventory(car.created_at)

                return (
                  <article key={car.id} className="car-card">
                    {/* Image */}
                    <div className="car-card-image">
                      {cover ? (
                        <img
                          src={carPhotoUrl(cover.filename, cover.subfolder)}
                          alt={carTitle}
                        />
                      ) : (
                        <div className="no-image">
                          <img src="/fallback_car.png" alt="Fallback" className="fallback-img" />
                        </div>
                      )}
                      
                      {/* Soft dark overlay */}
                      <div className="image-overlay" />
                      
                      <span className="car-status-badge">متوفرة</span>
                      <span className="car-time-badge">
                        <Clock className="h-3 w-3" />
                        {daysInStock}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="car-card-body">
                      <div className="car-card-header-info">
                        <div className="car-year-cond">
                          <span className="car-year">{car.manufacturing_year}</span>
                          <span className="car-condition">{car.condition === 'New' ? 'جديدة' : 'مستعملة'}</span>
                        </div>
                        <h3>{carTitle}</h3>
                        <p className="car-trim-text">{car.trim || 'فئة قياسية'}</p>
                      </div>

                      {/* Specs Icons Grid */}
                      <div className="car-specs-grid">
                        <div className="spec-badge">
                          <Gauge />
                          <span>{car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}</span>
                        </div>
                        <div className="spec-badge">
                          <Settings />
                          <span>{car.transmission ? (TRANS_LABEL[car.transmission] ?? car.transmission) : '—'}</span>
                        </div>
                        <div className="spec-badge">
                          <Fuel />
                          <span>{car.fuel_type ? (FUEL_LABEL[car.fuel_type] ?? car.fuel_type) : '—'}</span>
                        </div>
                      </div>

                      {/* Footer: Price & CTA */}
                      <div className="car-card-footer">
                        <div className="car-price-block">
                          <span>سعر البيع المطلوب</span>
                          <strong>{price}</strong>
                        </div>
                        <Link href={`/showroom/${car.id}`} className="view-details-btn">
                          معاينة وتفاصيل
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="showroom-pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="page-btn"
                >
                  السابق
                </button>
                <span className="page-info">
                  الصفحة {page} من {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="page-btn"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Styled JSX (Vanilla CSS) */}
      <style jsx global>{`
        .showroom-container {
          min-height: 100vh;
          background-color: #080808;
          font-family: 'Tajawal', 'Segoe UI', sans-serif;
          color: #ffffff;
          padding: 0 0 60px 0;
        }

        /* Header Styles */
        .showroom-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #0e0e0e;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 40px;
          height: 72px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        }
        .showroom-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .brand-logo-container {
          height: 38px;
          width: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 27, 45, 0.08);
          border: 1px solid rgba(239, 27, 45, 0.2);
          border-radius: 8px;
          padding: 2px;
        }
        .showroom-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .showroom-brand h1 {
          font-size: 16px;
          font-weight: 950;
          margin: 0;
          color: #ffffff;
          line-height: 1.2;
        }
        .showroom-brand p {
          font-size: 11px;
          color: #888888;
          margin: 2px 0 0 0;
          font-weight: 600;
        }
        .admin-login-link {
          font-size: 12px;
          font-weight: 800;
          color: #ffffff;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 8px 18px;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.2s ease;
        }
        .admin-login-link:hover {
          background-color: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* Hero Banner */
        .showroom-hero {
          position: relative;
          background: #0c0c0c;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding: 60px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          overflow: hidden;
        }
        .hero-glow-flare {
          position: absolute;
          top: -10%;
          right: 30%;
          width: 400px;
          height: 400px;
          background: rgba(239, 27, 45, 0.05);
          border-radius: 9999px;
          blur: 100px;
          filter: blur(100px);
          pointer-events: none;
        }
        .hero-content {
          max-width: 680px;
          position: relative;
          z-index: 10;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #ef4444;
          background: rgba(239, 27, 45, 0.08);
          border: 1px solid rgba(239, 27, 45, 0.2);
          padding: 4px 14px;
          border-radius: 99px;
          margin-bottom: 14px;
        }
        .hero-content h2 {
          font-size: 34px;
          font-weight: 950;
          margin: 0;
          line-height: 1.25;
          letter-spacing: -0.5px;
          color: #ffffff;
          font-family: 'Tajawal', sans-serif;
        }
        .hero-content p {
          font-size: 14px;
          color: #a3a3a3;
          margin: 10px 0 0 0;
          line-height: 1.6;
        }

        /* Search input bar */
        .search-wrapper {
          position: relative;
          width: 100%;
          max-width: 580px;
          margin-top: 8px;
          z-index: 10;
        }
        .search-icon {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #737373;
        }
        .search-wrapper input {
          width: 100%;
          height: 52px;
          background: #121212;
          border: 1.5px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 0 52px 0 20px;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
        }
        .search-wrapper input:focus {
          outline: none;
          border-color: rgba(239, 27, 45, 0.4);
          box-shadow: 0 10px 30px rgba(239, 27, 45, 0.15);
        }

        /* Main showroom */
        .showroom-main {
          max-width: 1380px;
          margin: 40px auto 0;
          padding: 0 40px;
          box-sizing: border-box;
        }

        /* Loading / Error States */
        .showroom-loading, .showroom-error, .showroom-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
          color: #a3a3a3;
        }
        .showroom-spin {
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          color: #ef4444;
          margin-bottom: 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-icon {
          width: 56px;
          height: 56px;
          color: #404040;
          margin-bottom: 14px;
        }
        .showroom-empty h3 {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }
        .showroom-empty p {
          font-size: 14px;
          margin: 6px 0 0 0;
        }

        /* Cars Grid */
        .cars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        .car-card {
          background: #0e0e0e;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .car-card::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          border-radius: inherit;
          border: 1px solid transparent;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .car-card:hover {
          transform: translateY(-8px);
          border-color: rgba(239, 27, 45, 0.35);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(239, 27, 45, 0.1);
        }

        .car-card-image {
          height: 260px;
          position: relative;
          background: #070707;
          overflow: hidden;
        }
        .car-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .car-card:hover .car-card-image img {
          transform: scale(1.05);
        }
        .no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 50% 110%, rgba(239, 27, 45, 0.1), transparent 50%);
          padding: 24px;
        }
        .fallback-img {
          width: 90% !important;
          height: 90% !important;
          object-fit: contain !important;
          opacity: 0.65;
          filter: drop-shadow(0 12px 25px rgba(239, 27, 45, 0.3));
        }
        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, #0e0e0e 0%, transparent 60%);
          opacity: 0.9;
          pointer-events: none;
        }
        .car-status-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 99px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          z-index: 10;
        }
        .car-time-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(0, 0, 0, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          font-size: 10px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          z-index: 10;
        }
        .car-time-badge :global(svg) {
          color: #ef4444;
        }

        .car-card-body {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
        }
        .car-card-header-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .car-year-cond {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
        }
        .car-year {
          color: #ef4444;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.5px;
        }
        .car-condition {
          color: #737373;
        }
        .car-card-header-info h3 {
          font-size: 18px;
          font-weight: 950;
          color: #ffffff;
          margin: 0;
          line-height: 1.25;
          font-family: 'Tajawal', sans-serif;
        }
        .car-trim-text {
          font-size: 12px;
          color: #a3a3a3;
          margin: 0;
        }

        /* Quick specs badges */
        .car-specs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          border-y: 1px solid rgba(255, 255, 255, 0.04);
          padding: 10px 0;
        }
        .spec-badge {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 8px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }
        .spec-badge :global(svg) {
          width: 14px;
          height: 14px;
          color: rgba(239, 27, 45, 0.8);
        }
        .spec-badge span {
          font-size: 10px;
          font-weight: 800;
          color: #a3a3a3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        /* Footer of card */
        .car-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 4px;
        }
        .car-price-block {
          display: flex;
          flex-direction: column;
        }
        .car-price-block span {
          font-size: 9px;
          color: #737373;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .car-price-block strong {
          font-size: 16px;
          font-weight: 950;
          color: #ffffff;
          font-family: 'Inter', 'Tajawal', sans-serif;
        }
        .view-details-btn {
          background-color: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .view-details-btn:hover {
          background-color: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 4px 10px rgba(239, 27, 45, 0.2);
        }

        /* Pagination style */
        .showroom-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 40px;
        }
        .page-btn {
          background: #121212;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-radius: 10px;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .page-btn:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.04);
        }
        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-info {
          font-size: 12px;
          font-weight: 800;
          color: #737373;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .cars-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (max-width: 768px) {
          .cars-grid { grid-template-columns: 1fr; gap: 20px; }
          .showroom-header { padding: 14px 20px; }
          .showroom-hero { padding: 40px 20px; }
          .showroom-main { padding: 0 20px; }
        }
        @media (max-width: 600px) {
          .showroom-brand h1 { font-size: 14px; }
          .showroom-brand p { display: none; }
          .hero-content h2 { font-size: 24px; }
        }
      `}</style>
    </div>
  )
}
