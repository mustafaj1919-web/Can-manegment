'use client'

import { useState, useEffect } from 'react'
import type { ElementType } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Armchair,
  BadgeInfo,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CircleGauge,
  Cog,
  Download,
  Fuel,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Tag,
  Wrench,
} from 'lucide-react'
import { getCarById } from '@/lib/api/inventory'
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

export default function CarSpecificationPage() {
  const params = useParams<{ id: string }>()
  const carId = params.id

  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const publicUrl = `${window.location.origin}/showroom/${carId}`
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`)
    }
  }, [carId])

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['car-spec', carId],
    queryFn: () => getCarById(carId),
    enabled: !!carId,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="spec-shell" dir="rtl">
        <div className="spec-state">
          <Loader2 className="spec-spin" />
          <p>جاري تحميل مواصفات السيارة...</p>
        </div>
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="spec-shell" dir="rtl">
        <div className="spec-state">
          <AlertCircle className="spec-error-icon" />
          <p>تعذر تحميل بيانات السيارة</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  const photos = car.photos ?? []
  const cover = photos[0]
  const gallery = photos.slice(1, 6)
  const visiblePhotos = [cover, ...gallery].filter(Boolean)
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

  return (
    <div className="spec-shell" dir="rtl">
      {/* Toolbar for Print actions */}
      <div className="spec-toolbar print:hidden">
        <div>
          <h1>مواصفات السيارة</h1>
          <p>{carTitle} {carSubtitle}</p>
        </div>
        <div className="spec-toolbar-actions">
          <Button onClick={() => window.print()} className="spec-print-btn">
            <Printer className="h-4 w-4" />
            طباعة المواصفات
          </Button>
        </div>
      </div>

      {/* Main Document designed for A4 Landscape */}
      <article className="spec-doc">
        {/* Right Column: Logo, Large Image, Gallery, QR Code (First in RTL layout) */}
        <section className="spec-right-col">
          {/* Showroom Branding */}
          <div className="spec-brand-container">
            <img src="/logo.png" alt="معرض الأصدقاء" className="spec-showroom-logo" />
            <div className="spec-brand-text">
              <h2>شركة الأصدقاء</h2>
              <span>لتجارة واستيراد السيارات الفاخرة</span>
            </div>
          </div>

          {/* Large Hero Image */}
          <div className="spec-hero-container glare-effect">
            {cover ? (
              <img
                src={carPhotoUrl(cover.filename, cover.subfolder ?? 'vehicles')}
                alt={carTitle}
                className="spec-hero-img"
              />
            ) : (
              <div className="spec-no-photo-box">لا توجد صورة متوفرة للسيارة</div>
            )}
            <div className="spec-seal-cert">
              <ShieldCheck className="spec-seal-icon" />
              <span>فحص مضمون</span>
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {visiblePhotos.length > 1 && (
            <div className="spec-gallery-grid">
              {visiblePhotos.slice(0, 5).map((photo, index) => (
                <img
                  key={photo.id}
                  src={carPhotoUrl(photo.filename, photo.subfolder ?? 'vehicles')}
                  alt={`صورة جانبية ${index + 1}`}
                  className="spec-gallery-thumb"
                />
              ))}
            </div>
          )}

          {/* QR Code and Bottom Highlights */}
          <div className="spec-right-bottom">
            <div className="spec-qr-card">
              {qrUrl ? (
                <img src={qrUrl} alt="رمز الاستجابة السريعة" className="spec-qr-img" />
              ) : (
                <QrCode className="spec-qr-icon" />
              )}
              <div className="spec-qr-text">
                <strong>مسح الرمز (QR)</strong>
                <span>لرؤية كامل تفاصيل السيارة والمستندات</span>
              </div>
            </div>
            <div className="spec-cert-text">
              <ShieldCheck className="h-4 w-4 text-emerald-600 inline" />
              <span>بطاقة فنية موثقة ومعتمدة من إدارة معرض الأصدقاء لتجارة السيارات.</span>
            </div>
          </div>
        </section>

        {/* Left Column: Title, Specs Cards, Features, Table, Price and Contact (Second in RTL layout) */}
        <section className="spec-left-col">
          {/* Header */}
          <header className="spec-header">
            <span className="spec-badge-top">وثيقة المواصفات الفنية المعتمدة</span>
            <h1 className="spec-title">{carTitle}</h1>
            <p className="spec-subtitle">{carSubtitle} ({conditionLabel})</p>
          </header>

          {/* Quick Specifications Grid */}
          <div className="spec-grid">
            <div className="spec-card">
              <CircleGauge className="spec-card-icon" />
              <div className="spec-card-info">
                <span className="spec-card-label">المسافة المقطوعة</span>
                <strong className="spec-card-val">{car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Cog className="spec-card-icon" />
              <div className="spec-card-info">
                <span className="spec-card-label">المحرك</span>
                <strong className="spec-card-val">{displayValue(car.engine_size)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Wrench className="spec-card-icon" />
              <div className="spec-card-info">
                <span className="spec-card-label">ناقل الحركة</span>
                <strong className="spec-card-val">{displayValue(transmissionLabel)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Fuel className="spec-card-icon" />
              <div className="spec-card-info">
                <span className="spec-card-label">نوع الوقود</span>
                <strong className="spec-card-val">{displayValue(fuelLabel)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Palette className="spec-card-icon" />
              <div className="spec-card-info">
                <span className="spec-card-label">اللون الخارجي</span>
                <strong className="spec-card-val">{displayValue(car.color)}</strong>
              </div>
            </div>
            <div className="spec-card">
              <Armchair className="spec-card-icon" />
              <div className="spec-card-info">
                <span className="spec-card-label">عدد المقاعد</span>
                <strong className="spec-card-val">{displayValue(car.seat_count)}</strong>
              </div>
            </div>
          </div>

          {/* Features Checklist */}
          <div className="spec-features-section">
            <h3 className="spec-section-title">الميزات والتجهيزات</h3>
            <div className="spec-features-grid">
              {featureList.slice(0, 8).map((feat, idx) => (
                <div className="spec-feature-item" key={idx}>
                  <CheckCircle2 className="spec-feature-icon" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details Table */}
          <div className="spec-details-table">
            <div className="spec-table-row">
              <span className="spec-table-lbl">رقم الشاصي (VIN)</span>
              <strong className="spec-table-val font-mono">{displayValue(car.vin)}</strong>
            </div>
            <div className="spec-table-row">
              <span className="spec-table-lbl">بلد الاستيراد</span>
              <strong className="spec-table-val">{displayValue(car.import_country)}</strong>
            </div>
            <div className="spec-table-row">
              <span className="spec-table-lbl">حالة اللوحة</span>
              <strong className="spec-table-val">{displayValue(plateLabel)}</strong>
            </div>
            <div className="spec-table-row">
              <span className="spec-table-lbl">رقم اللوحة</span>
              <strong className="spec-table-val">{displayValue(car.plate_number)}</strong>
            </div>
          </div>

          {/* Price & Contact Panel */}
          <div className="spec-price-contact-panel">
            <div className="spec-price-card">
              <span className="spec-price-lbl">سعر البيع</span>
              <strong className="spec-price-val">{price}</strong>
              <span className="spec-availability-badge">{translateStatus(car.status)}</span>
            </div>
            <div className="spec-contact-info">
              <h3>للاستفسار والتواصل</h3>
              <div className="spec-phone-grid">
                {CONTACT_LINES.map((line, idx) => (
                  <div className="spec-phone-item" key={idx}>
                    <Phone className="spec-phone-icon" />
                    <span className="spec-phone-name">{line.name}</span>
                    <bdi className="spec-phone-num">{line.phone}</bdi>
                  </div>
                ))}
              </div>
              <p className="spec-address-line">
                <MapPin className="spec-address-icon" />
                <span>{SHOWROOM_ADDRESS}</span>
              </p>
            </div>
          </div>
        </section>
      </article>

      {/* Styled JSX (Vanilla CSS Styles) */}
      <style jsx global>{`
        /* Core page styling representing a clean desk/workspace */
        .spec-shell {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 24px 20px 40px;
          direction: rtl;
          font-family: 'Tajawal', 'Inter', 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .spec-state {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #475569;
        }
        .spec-spin { width: 34px; height: 34px; animation: spec-spin 1s linear infinite; }
        .spec-error-icon { width: 38px; height: 38px; color: #ef4444; }
        @keyframes spec-spin { to { transform: rotate(360deg); } }

        /* Toolbar styles */
        .spec-toolbar {
          width: 100%;
          max-width: 297mm;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
        }
        .spec-toolbar h1 {
          color: #0f172a;
          font-size: 22px;
          font-weight: 800;
          margin: 0;
        }
        .spec-toolbar p {
          color: #64748b;
          font-size: 13px;
          margin: 4px 0 0;
        }
        .spec-print-btn {
          background: #0f172a !important;
          color: #ffffff !important;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          height: 40px;
          padding: 0 18px;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
          transition: all 0.2s ease;
        }
        .spec-print-btn:hover {
          background: #1e293b !important;
          transform: translateY(-1px);
        }

        /* Document Container (A4 Landscape aspect-ratio styled card) */
        .spec-doc {
          width: 297mm;
          height: 210mm;
          min-width: 297mm;
          min-height: 210mm;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
          display: grid;
          grid-template-columns: 48% 52%;
          overflow: hidden;
          box-sizing: border-box;
          color: #0f172a;
          position: relative;
        }

        /* Right Column Styling */
        .spec-right-col {
          padding: 18px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-sizing: border-box;
          background: #f8fafc;
          border-left: 1px solid #e2e8f0;
        }

        /* Left Column Styling */
        .spec-left-col {
          padding: 18px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          box-sizing: border-box;
        }

        .spec-header {
          margin-bottom: 10px;
        }
        .spec-badge-top {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          color: #b89218;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
          border-bottom: 2px solid #b89218;
          padding-bottom: 1px;
        }
        .spec-title {
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.5px;
        }
        .spec-subtitle {
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
          margin: 3px 0 0;
        }

        /* Quick Specifications Grid */
        .spec-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .spec-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spec-card-icon {
          width: 20px;
          height: 20px;
          color: #475569;
          flex-shrink: 0;
        }
        .spec-card-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .spec-card-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
        }
        .spec-card-val {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Features Section */
        .spec-features-section {
          margin-bottom: 12px;
        }
        .spec-section-title {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .spec-features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px;
        }
        .spec-feature-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
        }
        .spec-feature-icon {
          width: 14px;
          height: 14px;
          color: #10b981;
          flex-shrink: 0;
        }

        /* Extended Specs Details Table */
        .spec-details-table {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 12px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .spec-table-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .spec-table-row:last-child {
          border-bottom: none;
        }
        .spec-table-lbl {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }
        .spec-table-val {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
        }

        /* Price and Contact Panel */
        .spec-price-contact-panel {
          display: grid;
          grid-template-columns: 42% 58%;
          gap: 12px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 8px;
          padding: 10px 14px;
          align-items: center;
        }
        .spec-price-card {
          display: flex;
          flex-direction: column;
          border-left: 1px solid rgba(255, 255, 255, 0.15);
          padding-left: 10px;
        }
        .spec-price-lbl {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .spec-price-val {
          font-size: 22px;
          font-weight: 900;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          line-height: 1.1;
        }
        .spec-availability-badge {
          display: inline-block;
          align-self: flex-start;
          margin-top: 4px;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .spec-contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .spec-contact-info h3 {
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
          margin: 0;
        }
        .spec-phone-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }
        .spec-phone-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
        }
        .spec-phone-icon {
          width: 11px;
          height: 11px;
          color: #b89218;
          flex-shrink: 0;
        }
        .spec-phone-name {
          color: #e2e8f0;
          margin-left: 2px;
        }
        .spec-phone-num {
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          direction: ltr;
        }
        .spec-address-line {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: #cbd5e1;
          margin: 2px 0 0 0;
          font-weight: 700;
        }
        .spec-address-icon {
          width: 11px;
          height: 11px;
          color: #b89218;
          flex-shrink: 0;
        }

        /* Branding Container */
        .spec-brand-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .spec-showroom-logo {
          width: 50px;
          height: 38px;
          object-fit: contain;
        }
        .spec-brand-text h2 {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }
        .spec-brand-text span {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          display: block;
        }

        /* Large Hero Image */
        .spec-hero-container {
          width: 100%;
          height: 94mm;
          position: relative;
          background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%);
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spec-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .spec-no-photo-box {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
        }
        .spec-seal-cert {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 3px 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        .spec-seal-icon {
          width: 14px;
          height: 14px;
          color: #059669;
        }
        .spec-seal-cert span {
          font-size: 9px;
          font-weight: 800;
          color: #065f46;
        }

        /* Gallery Grid */
        .spec-gallery-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
          margin-top: 8px;
        }
        .spec-gallery-thumb {
          width: 100%;
          height: 14mm;
          object-fit: cover;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          transition: border-color 0.15s ease;
        }
        .spec-gallery-thumb:hover {
          border-color: #0f172a;
        }

        /* Right Column Bottom info (QR Code + Small Cert Text) */
        .spec-right-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }
        .spec-qr-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          flex: 1;
        }
        .spec-qr-icon {
          width: 32px;
          height: 32px;
          color: #0f172a;
          flex-shrink: 0;
        }
        .spec-qr-img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          flex-shrink: 0;
          border-radius: 4px;
        }
        .spec-qr-text {
          display: flex;
          flex-direction: column;
        }
        .spec-qr-text strong {
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
        }
        .spec-qr-text span {
          font-size: 8px;
          color: #64748b;
          font-weight: 700;
        }
        .spec-cert-text {
          font-size: 9px;
          color: #64748b;
          font-weight: 700;
          max-width: 160px;
          line-height: 1.35;
          text-align: left;
        }

        /* Print Specific Styles */
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          
          /* Hide non-printable items */
          aside, header, nav, .spec-toolbar, .print\\:hidden {
            display: none !important;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            overflow: hidden !important;
          }

          .app-shell-root,
          .app-shell-content,
          .page-container,
          .page-container > div {
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            overflow: hidden !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            transform: none !important;
          }

          .spec-shell {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            justify-content: center;
            align-items: center;
            overflow: hidden !important;
            display: flex !important;
          }

          .spec-doc {
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          /* Force precise layout colors for PDF/Print engines */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
