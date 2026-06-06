'use client'

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
  Settings,
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

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="spec-row">
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  )
}

function IconSpecRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value?: string | number | null
}) {
  return (
    <div className="spec-icon-row">
      <Icon className="spec-icon" />
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  )
}

function FeatureItem({ children }: { children: string }) {
  return (
    <div className="spec-feature">
      <CheckCircle2 />
      <span>{children}</span>
    </div>
  )
}

function openPdfDialog() {
  document.title = 'car-specification'
  window.print()
}

export default function CarSpecificationPage() {
  const params = useParams<{ id: string }>()
  const carId = Number(params.id)

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['car-spec', carId],
    queryFn: () => getCarById(carId),
    enabled: Number.isFinite(carId),
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
  const photoCount = Math.max(photos.length, 1)
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
      <div className="spec-toolbar print:hidden">
        <div>
          <h1>مواصفات السيارة</h1>
          <p>{carTitle} {carSubtitle}</p>
        </div>
        <div className="spec-toolbar-actions">
          <Button onClick={() => window.print()} className="spec-print-btn">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button onClick={openPdfDialog} className="spec-pdf-btn">
            <Download className="h-4 w-4" />
            تنزيل PDF
          </Button>
        </div>
      </div>

      <article className="spec-doc">
        <section className="spec-left">
          <div className="spec-hero">
            <div className="spec-hero-top">
              <div>
                <h2>{carTitle}</h2>
                <strong>{car.manufacturing_year}</strong>
                <p>{carSubtitle}</p>
              </div>
              <div className="spec-brand">
                <img src="/logo.png" alt="معرض الأصدقاء" />
                <span>{car.brand}</span>
              </div>
            </div>

            <div className="spec-hero-image">
              {cover ? (
                <img src={carPhotoUrl(cover.filename, cover.subfolder ?? 'vehicles')} alt={carTitle} />
              ) : (
                <div className="spec-no-photo">لا توجد صورة</div>
              )}
              <div className="spec-seal">
                <ShieldCheck />
                <strong>{conditionLabel}</strong>
                <span>بيانات مخزون موثقة</span>
              </div>
              <span className="spec-counter">1/{photoCount}</span>
            </div>

            {visiblePhotos.length > 0 && (
              <div className="spec-thumbs">
                {visiblePhotos.slice(0, 6).map((photo, index) => (
                  <img
                    key={photo!.id}
                    src={carPhotoUrl(photo!.filename, photo!.subfolder ?? 'vehicles')}
                    alt={`صورة ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="spec-metrics">
            <div><CircleGauge /><span>المسافة المقطوعة</span><strong>{car.mileage != null ? `${formatNumber(car.mileage)} كم` : '—'}</strong></div>
            <div><Cog /><span>نوع المحرك</span><strong>{displayValue(car.engine_size)}</strong></div>
            <div><Settings /><span>ناقل الحركة</span><strong>{displayValue(transmissionLabel)}</strong></div>
            <div><Fuel /><span>نوع الوقود</span><strong>{displayValue(fuelLabel)}</strong></div>
            <div><Palette /><span>اللون الخارجي</span><strong>{car.color}</strong></div>
            <div><Armchair /><span>عدد المقاعد</span><strong>{displayValue(car.seat_count)}</strong></div>
          </div>

          <div className="spec-commercial">
            <div className="spec-price">
              <span>السعر</span>
              <strong>{price}</strong>
              <em>{translateStatus(car.status)}</em>
            </div>
            <div className="spec-contact">
              <strong>للتواصل والاستفسار</strong>
              {CONTACT_LINES.map((line) => (
                <span key={line.phone}>
                  <Phone />
                  <bdi>{line.phone}</bdi>
                  <em>{line.name}</em>
                </span>
              ))}
              <span className="spec-address-line"><MapPin /> {SHOWROOM_ADDRESS}</span>
            </div>
            <div className="spec-qr">
              <QrCode />
              <span>QR</span>
            </div>
          </div>
        </section>

        <section className="spec-right">
          <div className="spec-panel">
            <div className="spec-panel-title">
              <Settings />
              <h3>المواصفات الرئيسية</h3>
            </div>
            <IconSpecRow icon={CalendarDays} label="الموديل" value={car.manufacturing_year} />
            <IconSpecRow icon={Tag} label="الفئة" value={car.trim} />
            <IconSpecRow icon={CarFront} label="نوع السيارة" value={conditionLabel} />
            <IconSpecRow icon={Wrench} label="المحرك" value={car.engine_size} />
            <IconSpecRow icon={Cog} label="عدد الأسطوانات" value={car.cylinders} />
            <IconSpecRow icon={Settings} label="ناقل الحركة" value={transmissionLabel} />
            <IconSpecRow icon={Fuel} label="نوع الوقود" value={fuelLabel} />
            <IconSpecRow icon={Palette} label="اللون" value={car.color} />
            <IconSpecRow icon={Armchair} label="المقاعد" value={car.seat_count} />
            <IconSpecRow icon={ShieldCheck} label="حالة اللوحة" value={plateLabel} />
          </div>

          <div className="spec-panel">
            <div className="spec-panel-title">
              <CheckCircle2 />
              <h3>المميزات</h3>
            </div>
            <div className="spec-features">
              {featureList.slice(0, 10).map((feature) => (
                <FeatureItem key={feature}>{feature}</FeatureItem>
              ))}
            </div>
          </div>

          <div className="spec-info-grid">
            <div className="spec-panel">
              <div className="spec-panel-title">
                <BadgeInfo />
                <h3>معلومات إضافية</h3>
              </div>
              <SpecRow label="الماركة" value={car.brand} />
              <SpecRow label="الموديل" value={car.model} />
              <SpecRow label="رقم الشاصي" value={car.vin} />
              <SpecRow label="رقم اللوحة" value={car.plate_number} />
              <SpecRow label="بلد الاستيراد" value={car.import_country} />
              <SpecRow label="الفرع" value={car.branch?.name} />
            </div>

            <div className="spec-logo-panel">
              <img src="/logo.png" alt="معرض الأصدقاء" />
              <strong>معرض الأصدقاء</strong>
              <span>لتجارة السيارات</span>
            </div>
          </div>

          {car.notes && (
            <div className="spec-panel spec-notes">
              <span>ملاحظات</span>
              <p>{car.notes}</p>
            </div>
          )}
        </section>

        <footer className="spec-bottom-bar">
          <span><ShieldCheck /> فحص بيانات السيارة</span>
          <span><BadgeInfo /> تقرير مخزون</span>
          <span><CircleGauge /> عداد المسافات</span>
          <span><CarFront /> متوفر للعرض</span>
        </footer>
      </article>

      <style jsx global>{`
        .spec-shell {
          min-height: 100vh;
          background: #07111f;
          padding: 28px 18px 40px;
          direction: rtl;
          font-family: 'Tajawal', 'Arial', sans-serif;
        }

        .spec-state {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #94a3b8;
        }
        .spec-spin { width: 34px; height: 34px; animation: spec-spin 1s linear infinite; }
        .spec-error-icon { width: 38px; height: 38px; color: #ef4444; }
        @keyframes spec-spin { to { transform: rotate(360deg); } }

        .spec-toolbar {
          max-width: 1480px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .spec-toolbar h1 {
          color: #f8fafc;
          font-size: 24px;
          font-weight: 900;
          margin: 0;
        }
        .spec-toolbar p {
          color: #8aa0bd;
          font-size: 13px;
          margin: 4px 0 0;
        }
        .spec-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .spec-print-btn,
        .spec-pdf-btn {
          background: #102842 !important;
          border: 1px solid #355a83 !important;
          color: #fff !important;
          border-radius: 10px;
          min-width: 118px;
          gap: 8px;
        }
        .spec-pdf-btn {
          background: #b89218 !important;
          border-color: #d8b12d !important;
          color: #07111f !important;
          font-weight: 900;
        }

        .spec-doc {
          max-width: 1480px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(520px, 54%) minmax(420px, 46%);
          grid-template-areas:
            "left right"
            "bottom bottom";
          background: #f8fafc;
          border: 1px solid #d7dee8;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);
          color: #172033;
        }

        .spec-left {
          grid-area: left;
          background: #ffffff;
          border-left: 1px solid #d7dee8;
          padding: 10px;
        }
        .spec-right {
          grid-area: right;
          display: grid;
          gap: 12px;
          padding: 18px 16px;
          background: #fbfcfe;
        }

        .spec-hero {
          background: #07111a;
          border-radius: 8px;
          overflow: hidden;
          color: #ffffff;
          position: relative;
        }
        .spec-hero-top {
          position: absolute;
          inset: 28px 28px auto 28px;
          z-index: 3;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          pointer-events: none;
        }
        .spec-hero-top h2 {
          margin: 0;
          font-family: 'Inter', 'Tajawal', sans-serif;
          font-size: 40px;
          line-height: 1;
          letter-spacing: 0;
          color: #ffffff;
          text-transform: uppercase;
        }
        .spec-hero-top strong {
          display: block;
          margin-top: 8px;
          font-size: 34px;
          line-height: 1;
          color: #ef2f38;
          font-family: 'Inter', sans-serif;
        }
        .spec-hero-top p {
          margin: 14px 0 0;
          padding-top: 12px;
          width: 300px;
          border-top: 2px solid rgba(255, 255, 255, 0.55);
          color: #e8edf4;
          font-size: 16px;
          font-weight: 800;
        }
        .spec-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .spec-brand img {
          width: 86px;
          height: 60px;
          object-fit: contain;
          filter: drop-shadow(0 8px 18px rgba(0,0,0,0.35));
        }
        .spec-brand span {
          color: #ef2f38;
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 24px;
          text-transform: uppercase;
        }

        .spec-hero-image {
          min-height: 560px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.10) 42%, rgba(0,0,0,0.30) 100%),
            radial-gradient(circle at 50% 95%, rgba(255,255,255,0.35), transparent 32%),
            linear-gradient(135deg, #111923 0%, #47515c 50%, #141b23 100%);
        }
        .spec-hero-image img {
          width: 92%;
          max-height: 430px;
          object-fit: contain;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 32px 34px rgba(0,0,0,0.55));
        }
        .spec-no-photo {
          width: calc(100% - 48px);
          height: 360px;
          margin: 130px 24px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed rgba(255,255,255,0.3);
          border-radius: 16px;
          color: #cbd5e1;
        }
        .spec-seal {
          position: absolute;
          right: 32px;
          top: 205px;
          z-index: 4;
          width: 132px;
          height: 132px;
          border-radius: 50%;
          background: rgba(255,255,255,0.96);
          color: #172033;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-align: center;
          box-shadow: 0 18px 30px rgba(0,0,0,0.25);
        }
        .spec-seal svg {
          width: 26px;
          height: 26px;
          color: #0f172a;
        }
        .spec-seal strong {
          font-size: 15px;
          font-weight: 900;
        }
        .spec-seal span {
          width: 92px;
          color: #4b5563;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.35;
        }
        .spec-counter {
          position: absolute;
          left: 24px;
          bottom: 18px;
          z-index: 5;
          background: rgba(10, 20, 32, 0.92);
          color: #ffffff;
          border-radius: 999px;
          padding: 7px 18px;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
        }
        .spec-thumbs {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 2px;
          background: #111827;
          padding: 3px;
        }
        .spec-thumbs img {
          width: 100%;
          height: 82px;
          object-fit: cover;
          border: 1px solid rgba(255,255,255,0.35);
        }

        .spec-metrics {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        .spec-metrics div {
          min-width: 0;
          padding: 15px 10px;
          text-align: center;
          border-left: 1px solid #e5eaf1;
        }
        .spec-metrics div:last-child { border-left: 0; }
        .spec-metrics svg {
          width: 28px;
          height: 28px;
          margin: 0 auto 7px;
          color: #333b47;
        }
        .spec-metrics span {
          display: block;
          color: #5f6b7c;
          font-size: 12px;
          font-weight: 800;
        }
        .spec-metrics strong {
          display: block;
          margin-top: 4px;
          color: #172033;
          font-size: 13px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .spec-commercial {
          margin-top: 12px;
          min-height: 136px;
          display: grid;
          grid-template-columns: 0.9fr 1.45fr 110px;
          gap: 20px;
          align-items: center;
          background: linear-gradient(135deg, #071521, #10273b);
          color: #ffffff;
          border-radius: 10px;
          padding: 18px 22px;
        }
        .spec-price span,
        .spec-contact strong {
          display: block;
          color: #bcc8d8;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .spec-price strong {
          display: block;
          font-family: 'Inter', sans-serif;
          color: #ffffff;
          font-size: 34px;
          line-height: 1;
          font-weight: 900;
        }
        .spec-price em {
          display: inline-block;
          margin-top: 10px;
          padding: 5px 12px;
          border-radius: 999px;
          background: rgba(47, 199, 118, 0.14);
          color: #4ade80;
          font-size: 12px;
          font-style: normal;
          font-weight: 900;
        }
        .spec-contact {
          border-inline-start: 1px solid rgba(255,255,255,0.18);
          padding-inline-start: 24px;
        }
        .spec-contact span {
          display: grid;
          grid-template-columns: 18px 120px 1fr;
          align-items: center;
          gap: 8px;
          color: #f8fafc;
          font-size: 14px;
          margin: 6px 0;
          direction: rtl;
        }
        .spec-contact bdi {
          direction: ltr;
          color: #d8a928;
          font-family: 'Inter', sans-serif;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0;
          text-align: left;
        }
        .spec-contact em {
          color: #f8fafc;
          font-size: 15px;
          font-style: normal;
          font-weight: 900;
          text-align: right;
          white-space: nowrap;
        }
        .spec-contact .spec-address-line {
          grid-template-columns: 18px 1fr;
          margin-top: 9px;
          color: #d8a928;
          font-size: 15px;
          font-weight: 900;
        }
        .spec-contact svg {
          width: 16px;
          height: 16px;
          color: #d8a928;
        }
        .spec-qr {
          height: 98px;
          border-radius: 8px;
          background:
            linear-gradient(90deg, #111 8px, transparent 8px) 0 0/16px 16px,
            linear-gradient(#111 8px, transparent 8px) 0 0/16px 16px,
            #ffffff;
          color: #111827;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          box-shadow: inset 0 0 0 7px #fff;
        }
        .spec-qr svg {
          width: 40px;
          height: 40px;
        }
        .spec-qr span {
          font-size: 11px;
          font-weight: 900;
        }

        .spec-panel {
          background: #ffffff;
          border: 1px solid #e1e7ef;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .spec-panel-title {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 22px;
          border-bottom: 1px solid #e7edf4;
          color: #172033;
        }
        .spec-panel-title svg {
          width: 25px;
          height: 25px;
          color: #ef2f38;
        }
        .spec-panel-title h3 {
          margin: 0;
          font-size: 22px;
          line-height: 1;
          font-weight: 900;
        }
        .spec-icon-row {
          display: grid;
          grid-template-columns: 28px 1fr 1.2fr;
          align-items: center;
          gap: 10px;
          min-height: 34px;
          padding: 0 22px;
          border-bottom: 1px solid #edf1f6;
          color: #172033;
        }
        .spec-icon-row:last-child { border-bottom: 0; }
        .spec-icon {
          width: 18px;
          height: 18px;
          color: #263241;
        }
        .spec-icon-row span {
          color: #4f5d70;
          font-size: 14px;
          font-weight: 800;
        }
        .spec-icon-row strong {
          color: #172033;
          font-size: 14px;
          font-weight: 900;
          text-align: left;
          overflow-wrap: anywhere;
        }

        .spec-features {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0;
          padding: 14px 22px 18px;
        }
        .spec-feature {
          min-height: 36px;
          display: grid;
          grid-template-columns: 22px 1fr;
          align-items: center;
          gap: 10px;
          color: #172033;
          font-size: 14px;
          font-weight: 800;
        }
        .spec-feature svg {
          width: 18px;
          height: 18px;
          color: #4aa381;
        }

        .spec-info-grid {
          display: grid;
          grid-template-columns: 1.35fr 0.75fr;
          gap: 12px;
        }
        .spec-row {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          min-height: 34px;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #edf1f6;
        }
        .spec-row:last-child { border-bottom: 0; }
        .spec-row span {
          color: #4f5d70;
          font-size: 14px;
          font-weight: 800;
        }
        .spec-row strong {
          color: #172033;
          font-size: 14px;
          font-weight: 900;
          text-align: left;
          overflow-wrap: anywhere;
        }
        .spec-logo-panel {
          background: #ffffff;
          border: 1px solid #e1e7ef;
          border-radius: 12px;
          min-height: 204px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .spec-logo-panel img {
          width: 130px;
          height: 98px;
          object-fit: contain;
        }
        .spec-logo-panel strong {
          color: #ef2f38;
          font-size: 19px;
          font-weight: 900;
        }
        .spec-logo-panel span {
          color: #475569;
          font-size: 13px;
          font-weight: 800;
        }
        .spec-notes {
          padding: 16px 20px;
        }
        .spec-notes span {
          display: block;
          color: #ef2f38;
          font-weight: 900;
          margin-bottom: 6px;
        }
        .spec-notes p {
          margin: 0;
          color: #334155;
          line-height: 1.7;
          font-weight: 700;
        }

        .spec-bottom-bar {
          grid-area: bottom;
          min-height: 62px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: linear-gradient(135deg, #071521, #10273b);
          color: #e8edf4;
          border-top: 1px solid #0f253a;
        }
        .spec-bottom-bar span {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-inline-start: 1px solid rgba(255,255,255,0.16);
          font-weight: 900;
          font-size: 14px;
        }
        .spec-bottom-bar span:last-child { border-inline-start: 0; }
        .spec-bottom-bar svg {
          width: 24px;
          height: 24px;
          color: #cbd5e1;
        }

        @media (max-width: 1100px) {
          .spec-doc {
            grid-template-columns: 1fr;
            grid-template-areas:
              "left"
              "right"
              "bottom";
          }
          .spec-left { border-left: 0; border-bottom: 1px solid #d7dee8; }
        }

        @media (max-width: 720px) {
          .spec-shell { padding: 14px 8px 24px; }
          .spec-hero-top {
            inset: 18px 18px auto 18px;
          }
          .spec-hero-top h2 { font-size: 28px; }
          .spec-hero-top strong { font-size: 26px; }
          .spec-hero-top p { width: 210px; font-size: 13px; }
          .spec-brand img { width: 62px; }
          .spec-brand span { font-size: 17px; }
          .spec-hero-image { min-height: 430px; }
          .spec-hero-image img { max-height: 280px; }
          .spec-seal {
            width: 104px;
            height: 104px;
            top: 170px;
            right: 18px;
          }
          .spec-thumbs { grid-template-columns: repeat(3, 1fr); }
          .spec-metrics,
          .spec-commercial,
          .spec-features,
          .spec-info-grid,
          .spec-bottom-bar {
            grid-template-columns: 1fr;
          }
          .spec-contact {
            border-inline-start: 0;
            padding-inline-start: 0;
            border-top: 1px solid rgba(255,255,255,0.16);
            padding-top: 16px;
          }
        }

        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          aside, header, nav, .spec-toolbar { display: none !important; }
          html, body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .spec-shell { padding: 0 !important; background: white !important; }
          .spec-doc {
            max-width: none;
            width: 287mm;
            min-height: 200mm;
            border-radius: 0;
            box-shadow: none;
            page-break-inside: avoid;
          }
          .spec-hero-image { min-height: 470px; }
          .spec-thumbs img { height: 68px; }
          .spec-commercial { min-height: 108px; }
          .spec-bottom-bar { min-height: 52px; }
        }
      `}</style>
    </div>
  )
}
