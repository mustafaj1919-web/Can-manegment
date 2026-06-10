'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  AlertCircle,
  Armchair,
  ArrowRight,
  CheckCircle2,
  CircleGauge,
  Cog,
  Fuel,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Printer,
  QrCode,
  Send,
  ShieldCheck,
  Tag,
  Wrench,
} from 'lucide-react'
import { getPublicCarById } from '@/lib/api/inventory'
import { formatMoney, formatNumber, translateStatus } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function carPhotoUrl(filename: string, subfolder = 'vehicles') {
  return `/static/uploads/${subfolder}/${filename}`
}

const FUEL_AR: Record<string, string> = {
  Gasoline: 'بنزين',
  Diesel: 'ديزل',
  Hybrid: 'هايبرد',
  Electric: 'كهربائي',
}

const TRANS_AR: Record<string, string> = {
  Automatic: 'أوتوماتيك',
  Manual: 'يدوي',
  CVT: 'CVT',
  DCT: 'DCT',
}

const CONDITION_AR: Record<string, string> = {
  New: 'جديدة',
  Used: 'مستعملة',
  Damaged: 'متضررة',
  Salvage: 'سكراب',
}

const PLATE_AR: Record<string, string> = {
  'No Plate': 'بدون لوحة',
  Temporary: 'مؤقتة',
  Registered: 'مسجلة',
}

const CONTACT_LINES = [
  { name: 'بإدارة أبو علي', phone: '07719681434' },
  { name: 'علي', phone: '07718752333' },
  { name: 'سجاد', phone: '07852525256' },
]

const SHOWROOM_ADDRESS = 'بغداد / الكريعات / شارع الوقف السني / قرب كلية القانون'

function displayValue(value?: string | number | null) {
  return value === null || value === undefined || value === '' ? '—' : value
}

export default function PublicCarDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const carId = Number(params.id)

  const [activePhoto, setActivePhoto] = useState<string | null>(null)

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['public-car-detail', carId],
    queryFn: () => getPublicCarById(carId),
    enabled: Number.isFinite(carId),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="showroom-detail-shell" dir="rtl">
        <div className="state-container">
          <Loader2 className="spin" />
          <p>جاري تحميل مواصفات السيارة...</p>
        </div>
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="showroom-detail-shell" dir="rtl">
        <div className="state-container">
          <AlertCircle className="error-icon" />
          <p>عذراً، تعذر تحميل بيانات السيارة أو أنها غير متوفرة حالياً</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/showroom')}>
            العودة للكتالوج
          </Button>
        </div>
      </div>
    )
  }

  const photos = car.photos ?? []
  const cover = photos[0]
  const gallery = photos.slice(1, 6)
  const visiblePhotos = [cover, ...gallery].filter(Boolean)
  const coverUrl = cover ? carPhotoUrl(cover.filename, cover.subfolder) : null
  const currentPhoto = activePhoto || coverUrl

  const carTitle = `${car.brand} ${car.model}`
  const carSubtitle = `${car.trim ? `${car.trim} ` : ''}${car.manufacturing_year}`
  const conditionLabel = car.condition ? (CONDITION_AR[car.condition] ?? car.condition) : '—'
  const transmissionLabel = car.transmission ? (TRANS_AR[car.transmission] ?? car.transmission) : null
  const fuelLabel = car.fuel_type ? (FUEL_AR[car.fuel_type] ?? car.fuel_type) : null
  const plateLabel = car.plate_status ? (PLATE_AR[car.plate_status] ?? car.plate_status) : null
  const price = car.selling_price ? formatMoney(car.selling_price, car.currency) : 'يحدد عند الطلب'

  const features = [
    transmissionLabel ? `${transmissionLabel} ناقل حركة` : null,
    fuelLabel ? `وقود ${fuelLabel}` : null,
    car.seat_count ? `${car.seat_count} مقاعد` : null,
    car.seat_material ? `مقاعد ${car.seat_material}` : null,
    car.engine_size ? `محرك ${car.engine_size}` : null,
    car.cylinders ? `${car.cylinders} سلندر` : null,
    plateLabel ? `لوحة ${plateLabel}` : null,
    car.import_country ? `استيراد ${car.import_country}` : null,
  ].filter(Boolean) as string[]

  const featureList = features.length
    ? features
    : ['بيانات مخزون موثقة', 'جاهزة للعرض في المعرض', 'بطاقة مواصفات قابلة للطباعة', 'مرتبطة بسجل السيارة']

  // WhatsApp Share Function
  const handleWhatsAppShare = () => {
    const pageUrl = window.location.href
    const specUrl = `${window.location.origin}/inventory/${car.id}/specification`
    const message = `🚗 *سيارة معروضة للبيع في معرض الأصدقاء*
*الماركة والموديل:* ${carTitle}
*السنة:* ${car.manufacturing_year}
*السعر:* ${price}
*الحالة:* ${conditionLabel}
*المسافة المقطوعة:* ${car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}
*ناقل الحركة:* ${displayValue(transmissionLabel)}

🔗 *معاينة وتفاصيل السيارة بالكامل:*
${pageUrl}

📄 *بطاقة المواصفات الفنية للطباعة (PDF):*
${specUrl}`

    const encoded = encodeURIComponent(message)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  return (
    <div className="showroom-detail-shell" dir="rtl">
      {/* Top Header */}
      <header className="detail-header">
        <Link href="/showroom" className="back-link">
          <ArrowRight className="h-4 w-4" />
          العودة للكتالوج العام
        </Link>
        <div className="detail-brand">
          <img src="/logo.png" alt="معرض الأصدقاء" className="brand-logo" />
        </div>
      </header>

      {/* Main Grid */}
      <main className="detail-content">
        {/* Left Column: Spec Cards, Features, Table */}
        <section className="detail-left-col">
          {/* Header */}
          <div className="car-heading">
            <span className="car-condition-badge">{conditionLabel}</span>
            <h1 className="car-title">{carTitle}</h1>
            <p className="car-subtitle">{carSubtitle}</p>
          </div>

          {/* Quick Specs Cards */}
          <div className="detail-specs-grid">
            <div className="spec-card">
              <CircleGauge />
              <div>
                <span>المسافة المقطوعة</span>
                <strong>{car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Cog />
              <div>
                <span>حجم المحرك</span>
                <strong>{displayValue(car.engine_size)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Wrench />
              <div>
                <span>ناقل الحركة</span>
                <strong>{displayValue(transmissionLabel)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Fuel />
              <div>
                <span>نوع الوقود</span>
                <strong>{displayValue(fuelLabel)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Palette />
              <div>
                <span>اللون الخارجي</span>
                <strong>{displayValue(car.color)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Armchair />
              <div>
                <span>عدد المقاعد</span>
                <strong>{displayValue(car.seat_count)}</strong>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="detail-features-block">
            <h3 className="block-title">الميزات والتجهيزات الفنية</h3>
            <div className="features-grid">
              {featureList.map((feat, idx) => (
                <div key={idx} className="feature-item">
                  <CheckCircle2 className="feature-icon" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details Table */}
          <div className="detail-table-block">
            <h3 className="block-title">البيانات الفنية للمركبة</h3>
            <div className="specs-table">
              <div className="table-row">
                <span>رقم الشاصي (VIN)</span>
                <strong className="font-mono">{displayValue(car.vin)}</strong>
              </div>
              <div className="table-row">
                <span>بلد الاستيراد</span>
                <strong>{displayValue(car.import_country)}</strong>
              </div>
              <div className="table-row">
                <span>حالة لوحة السيارة</span>
                <strong>{displayValue(plateLabel)}</strong>
              </div>
              <div className="table-row">
                <span>رقم اللوحة</span>
                <strong>{displayValue(car.plate_number)}</strong>
              </div>
              <div className="table-row">
                <span>الماركة والموديل</span>
                <strong>{car.brand} - {car.model}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Hero Image, Price Card, Action buttons */}
        <section className="detail-right-col">
          {/* Main Photo Box */}
          <div className="hero-photo-wrapper">
            {currentPhoto ? (
              <img src={currentPhoto} alt={carTitle} className="hero-photo-img" />
            ) : (
              <div className="no-photo-box">لا توجد صورة للمركبة</div>
            )}
            <span className="availability-pill">{translateStatus(car.status)}</span>
          </div>

          {/* Gallery Thumbnails */}
          {visiblePhotos.length > 1 && (
            <div className="gallery-thumbs-grid">
              {visiblePhotos.map((photo) => {
                const url = carPhotoUrl(photo.filename, photo.subfolder)
                const isSelected = currentPhoto === url
                return (
                  <button
                    key={photo.id}
                    className={`thumb-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setActivePhoto(url)}
                  >
                    <img src={url} alt="صورة مصغرة للسيارة" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Price and Action Cards */}
          <div className="pricing-action-box">
            <div className="price-tag-card">
              <span>سعر البيع المطلوب</span>
              <strong>{price}</strong>
            </div>

            {/* Direct Interaction Buttons */}
            <div className="actions-button-grid">
              <Button onClick={handleWhatsAppShare} className="btn-whatsapp">
                <Send className="h-4 w-4 rotate-180" />
                مشاركة عبر الواتساب
              </Button>
              <Link href={`/inventory/${car.id}/specification`} target="_blank" className="btn-print-spec">
                <Printer className="h-4 w-4" />
                طباعة بطاقة المواصفات فئة A4
              </Link>
            </div>
          </div>

          {/* Contact Details */}
          <div className="contact-box-showroom">
            <h3>للاستفسار المباشر والشراء</h3>
            <div className="showroom-phones">
              {CONTACT_LINES.map((line, idx) => (
                <div key={idx} className="phone-line">
                  <Phone className="phone-icon" />
                  <span className="phone-name">{line.name}:</span>
                  <bdi className="phone-num">{line.phone}</bdi>
                </div>
              ))}
            </div>
            <p className="showroom-address">
              <MapPin className="address-icon" />
              <span>{SHOWROOM_ADDRESS}</span>
            </p>
          </div>
        </section>
      </main>

      {/* Styled JSX (Vanilla CSS) */}
      <style jsx global>{`
        .showroom-detail-shell {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Tajawal', 'Inter', sans-serif;
          color: #0f172a;
          padding-bottom: 60px;
        }

        .state-container {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #64748b;
        }
        .spin { width: 34px; height: 34px; animation: spin 1s linear infinite; color: #b89218; }
        .error-icon { width: 42px; height: 42px; color: #ef4444; }

        /* Detail Header */
        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px 40px;
          height: 72px;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          transition: transform 0.15s ease;
        }
        .back-link:hover {
          transform: translateX(2px);
        }
        .brand-logo {
          width: 52px;
          height: 40px;
          object-fit: contain;
        }

        /* Layout Grid */
        .detail-content {
          max-width: 1380px;
          margin: 40px auto 0;
          padding: 0 40px;
          display: grid;
          grid-template-columns: 52% 48%;
          gap: 40px;
          box-sizing: border-box;
        }

        /* Left Column Details */
        .detail-left-col {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .car-heading {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .car-condition-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }
        .car-title {
          font-size: 38px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
          line-height: 1.15;
          letter-spacing: -1px;
        }
        .car-subtitle {
          font-size: 16px;
          color: #64748b;
          font-weight: 700;
          margin: 0;
        }

        /* Specs Grid */
        .detail-specs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .spec-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 6px rgba(15, 23, 42, 0.01);
        }
        .spec-card :global(svg) {
          width: 24px;
          height: 24px;
          color: #475569;
          flex-shrink: 0;
        }
        .spec-card div {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .spec-card span {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
        }
        .spec-card strong {
          font-size: 13px;
          font-weight: 850;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Features Section */
        .block-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 14px 0;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }
        .feature-icon {
          width: 16px;
          height: 16px;
          color: #10b981;
          flex-shrink: 0;
        }

        /* Details Table */
        .specs-table {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .table-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .table-row:last-child {
          border-bottom: none;
        }
        .table-row span {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }
        .table-row strong {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        /* Right Column Styling */
        .detail-right-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .hero-photo-wrapper {
          width: 100%;
          height: 380px;
          position: relative;
          background: #e2e8f0;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .no-photo-box {
          font-size: 14px;
          color: #64748b;
          font-weight: 700;
        }
        .availability-pill {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 850;
          padding: 4px 14px;
          border-radius: 99px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        /* Gallery thumbs */
        .gallery-thumbs-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }
        .thumb-btn {
          height: 64px;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          overflow: hidden;
          padding: 0;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .thumb-btn:hover {
          border-color: #64748b;
        }
        .thumb-btn.selected {
          border-color: #b89218;
          box-shadow: 0 0 0 2px rgba(184, 146, 24, 0.2);
        }

        /* Price & Action Box */
        .pricing-action-box {
          background: #0f172a;
          color: #ffffff;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
        }
        .price-tag-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .price-tag-card span {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 750;
        }
        .price-tag-card strong {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          line-height: 1;
        }

        .actions-button-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btn-whatsapp {
          background-color: #10b981 !important;
          color: #ffffff !important;
          font-weight: 800;
          height: 48px;
          font-size: 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.15s ease;
        }
        .btn-whatsapp:hover {
          opacity: 0.95;
        }
        .btn-print-spec {
          background-color: transparent;
          color: #ffffff;
          font-weight: 800;
          height: 48px;
          font-size: 14px;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .btn-print-spec:hover {
          background-color: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.4);
        }

        /* Showroom Contact */
        .contact-box-showroom {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(15, 23, 42, 0.01);
        }
        .contact-box-showroom h3 {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 14px 0;
          border-bottom: 1.5px solid #f1f5f9;
          padding-bottom: 8px;
        }
        .showroom-phones {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .phone-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 750;
        }
        .phone-icon {
          width: 12px;
          height: 12px;
          color: #b89218;
          flex-shrink: 0;
        }
        .phone-name {
          color: #64748b;
        }
        .phone-num {
          color: #0f172a;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          direction: ltr;
        }
        .showroom-address {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #475569;
          font-weight: 750;
          margin: 8px 0 0 0;
        }
        .address-icon {
          width: 12px;
          height: 12px;
          color: #b89218;
          flex-shrink: 0;
        }

        /* Responsive */
        @media (max-width: 1000px) {
          .detail-content {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 0 20px;
            margin-top: 24px;
          }
          .detail-header { padding: 14px 20px; }
          .hero-photo-wrapper { height: 280px; }
        }
        @media (max-width: 600px) {
          .car-title { font-size: 28px; }
          .detail-specs-grid { grid-template-columns: repeat(2, 1fr); }
          .features-grid { grid-template-columns: 1fr; }
          .showroom-phones { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
