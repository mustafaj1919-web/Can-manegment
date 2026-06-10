'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  CarFront,
  CircleGauge,
  Cog,
  Fuel,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import { getPublicCars, type Car, type CarsListResponse } from '@/lib/api/inventory'
import { formatMoney, formatNumber } from '@/lib/utils'

function carPhotoUrl(filename: string, subfolder = 'vehicles') {
  return `/static/uploads/${subfolder}/${filename}`
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
          <img src="/logo.png" alt="معرض الأصدقاء" className="showroom-logo" />
          <div>
            <h1>شركة الأصدقاء لتجارة السيارات</h1>
            <p>كتالوج السيارات الفاخرة المتاحة للبيع والتسليم الفوري</p>
          </div>
        </div>
        <Link href="/login" className="admin-login-link">
          دخول الموظفين
        </Link>
      </header>

      {/* Hero Welcome Section */}
      <section className="showroom-hero">
        <div className="hero-content">
          <span className="hero-badge"><Sparkles className="h-3.5 w-3.5" /> فخامة الاختيار وموثوقية التعامل</span>
          <h2>ابحث عن سيارة أحلامك اليوم</h2>
          <p>تصفح مواصفات سياراتنا الفاخرة مباشرة وشاركها مع أصدقائك بلمسة واحدة</p>
        </div>

        {/* Search Input */}
        <div className="search-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="ابحث بالماركة، الموديل، أو رقم الشاصي..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </section>

      {/* Cars Grid / List */}
      <main className="showroom-main">
        {isLoading ? (
          <div className="showroom-loading">
            <Loader2 className="showroom-spin" />
            <p>جاري تحميل كتالوج السيارات...</p>
          </div>
        ) : isError ? (
          <div className="showroom-error">
            <p>حدث خطأ أثناء تحميل الكتالوج. يرجى المحاولة مرة أخرى.</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="showroom-empty">
            <CarFront className="empty-icon" />
            <h3>لا توجد سيارات متوفرة حالياً</h3>
            <p>يرجى تجربة كلمة بحث أخرى أو مراجعة المعرض لاحقاً</p>
          </div>
        ) : (
          <>
            <div className="cars-grid">
              {cars.map((car: Car) => {
                const cover = car.cover_photo
                const price = car.selling_price
                  ? formatMoney(car.selling_price, car.currency)
                  : 'يحدد عند الطلب'
                const carTitle = `${car.brand} ${car.model}`

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
                        <div className="no-image">لا توجد صورة</div>
                      )}
                      <span className="car-status-badge">متوفرة</span>
                    </div>

                    {/* Content */}
                    <div className="car-card-body">
                      <div className="car-card-title">
                        <h3>{carTitle}</h3>
                        <span className="car-year">{car.manufacturing_year}</span>
                      </div>
                      <p className="car-trim-text">{car.trim || 'مواصفات قياسية'}</p>

                      {/* Specs Icons */}
                      <div className="car-specs-grid">
                        <div className="spec-badge">
                          <CircleGauge />
                          <span>{car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}</span>
                        </div>
                        <div className="spec-badge">
                          <Cog />
                          <span>{car.engine_size || '—'}</span>
                        </div>
                        <div className="spec-badge">
                          <Fuel />
                          <span>{car.fuel_type === 'Gasoline' ? 'بنزين' : car.fuel_type === 'Diesel' ? 'ديزل' : '—'}</span>
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className="car-card-footer">
                        <div className="car-price-block">
                          <span>سعر البيع</span>
                          <strong>{price}</strong>
                        </div>
                        <Link href={`/showroom/${car.id}`} className="view-details-btn">
                          التفاصيل
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
          background-color: #f8fafc;
          font-family: 'Tajawal', 'Segoe UI', sans-serif;
          color: #0f172a;
          padding: 0 0 60px 0;
        }

        /* Header Styles */
        .showroom-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px 40px;
          height: 72px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
        }
        .showroom-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .showroom-logo {
          width: 52px;
          height: 40px;
          object-fit: contain;
        }
        .showroom-brand h1 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }
        .showroom-brand p {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0 0 0;
          font-weight: 600;
        }
        .admin-login-link {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 16px;
          transition: all 0.2s ease;
        }
        .admin-login-link:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }

        /* Hero Banner */
        .showroom-hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          padding: 60px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .hero-content {
          max-width: 680px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 4px 14px;
          border-radius: 99px;
          margin-bottom: 14px;
        }
        .hero-content h2 {
          font-size: 34px;
          font-weight: 900;
          margin: 0;
          line-height: 1.25;
          letter-spacing: -0.5px;
        }
        .hero-content p {
          font-size: 15px;
          color: #94a3b8;
          margin: 10px 0 0 0;
          line-height: 1.6;
        }

        /* Search input bar */
        .search-wrapper {
          position: relative;
          width: 100%;
          max-width: 580px;
          margin-top: 8px;
        }
        .search-icon {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #94a3b8;
        }
        .search-wrapper input {
          width: 100%;
          height: 52px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 0 52px 0 20px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .search-wrapper input:focus {
          outline: none;
          border-color: #b89218;
          box-shadow: 0 10px 25px rgba(184, 146, 24, 0.15);
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
          color: #64748b;
        }
        .showroom-spin {
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          color: #b89218;
          margin-bottom: 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-icon {
          width: 56px;
          height: 56px;
          color: #cbd5e1;
          margin-bottom: 14px;
        }
        .showroom-empty h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .showroom-empty p {
          font-size: 14px;
          margin: 6px 0 0 0;
        }

        /* Cars Grid */
        .cars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .car-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(15, 23, 42, 0.02);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .car-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px rgba(15, 23, 42, 0.06);
        }

        .car-card-image {
          height: 180px;
          position: relative;
          background: #cbd5e1;
        }
        .car-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .no-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #cbd5e1;
          color: #64748b;
          font-weight: 700;
          font-size: 13px;
        }
        .car-status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(16, 185, 129, 0.9);
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 99px;
        }

        .car-card-body {
          padding: 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .car-card-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .car-card-title h3 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }
        .car-year {
          background: #f1f5f9;
          color: #475569;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .car-trim-text {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0 0;
          font-weight: 600;
        }

        /* Quick specs badges */
        .car-specs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin: 16px 0;
        }
        .spec-badge {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 6px;
          padding: 6px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }
        .spec-badge :global(svg) {
          width: 14px;
          height: 14px;
          color: #64748b;
        }
        .spec-badge span {
          font-size: 9px;
          font-weight: 800;
          color: #475569;
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
          border-top: 1px solid #f1f5f9;
          padding-top: 14px;
          margin-top: 10px;
        }
        .car-price-block {
          display: flex;
          flex-direction: column;
        }
        .car-price-block span {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .car-price-block strong {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          font-family: 'Inter', 'Tajawal', sans-serif;
        }
        .view-details-btn {
          background-color: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          border-radius: 6px;
          padding: 8px 14px;
          transition: background-color 0.15s ease;
        }
        .view-details-btn:hover {
          background-color: #1e293b;
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
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #0f172a;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .page-btn:hover:not(:disabled) {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .page-info {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .cars-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .cars-grid { grid-template-columns: repeat(2, 1fr); }
          .showroom-header { padding: 14px 20px; }
          .showroom-hero { padding: 40px 20px; }
          .showroom-main { padding: 0 20px; }
        }
        @media (max-width: 600px) {
          .cars-grid { grid-template-columns: 1fr; }
          .showroom-brand h1 { font-size: 15px; }
          .showroom-brand p { display: none; }
          .hero-content h2 { font-size: 26px; }
        }
      `}</style>
    </div>
  )
}
