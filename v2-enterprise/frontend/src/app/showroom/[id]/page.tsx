'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CircleGauge,
  Cog,
  Fuel,
  Loader2,
  MapPin,
  Palette,
  Phone,
  ShieldCheck,
  Armchair,
  MessageCircle,
  X,
} from 'lucide-react'
import { getPublicVehicleById, submitVehicleLead, type Car as CarType } from '@/lib/api/inventory'
import { formatNumber } from '@/lib/utils'

function carPhotoUrl(filename: string, subfolder = 'vehicles') {
  return `/static/uploads/${subfolder}/${filename}`
}

const FUEL_AR: Record<string, string> = { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' }
const TRANS_AR: Record<string, string> = { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' }
const CONDITION_AR: Record<string, string> = { New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة', Salvage: 'سكراب' }

const WHATSAPP_LINK = 'https://wa.me/9647719681434'
const CONTACT_LINES = [
  { name: 'أبو علي', phone: '07719681434' },
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
  const carId = params.id

  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const [photoBroken, setPhotoBroken] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['public-vehicle-detail', carId],
    queryFn: () => getPublicVehicleById(carId),
    enabled: Boolean(carId),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="story-detail-shell" dir="rtl">
        <div className="state-container">
          <Loader2 className="spin" />
          <p>جاري تحميل مواصفات السيارة...</p>
        </div>
        <DetailStyles />
      </div>
    )
  }

  if (isError || !car) {
    return (
      <div className="story-detail-shell" dir="rtl">
        <div className="state-container">
          <AlertCircle className="error-icon" />
          <p>عذراً، تعذر تحميل بيانات السيارة أو أنها غير متوفرة حالياً</p>
          <button className="btn-outline-sm" onClick={() => router.push('/showroom')}>
            العودة للكتالوج
          </button>
        </div>
        <DetailStyles />
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
  const conditionLabel = car.condition ? (CONDITION_AR[car.condition] ?? car.condition) : 'متوفرة'
  const transmissionLabel = car.transmission ? (TRANS_AR[car.transmission] ?? car.transmission) : null
  const fuelLabel = car.fuel_type ? (FUEL_AR[car.fuel_type] ?? car.fuel_type) : null

  const story = car.notes && car.notes.trim()
    ? car.notes.trim()
    : `${carTitle} موديل ${car.manufacturing_year}، من ضمن السيارات المفحوصة فنيًا والمعروضة حاليًا في صالة الأصدقاء، جاهزة للمعاينة والتقسيط.`

  return (
    <div className="story-detail-shell" dir="rtl">
      <header className="detail-header">
        <Link href="/showroom" className="back-link">
          <ArrowRight className="h-4 w-4" />
          العودة للكتالوج
        </Link>
        <img src="/logo.png" alt="معرض الأصدقاء" className="brand-logo" />
      </header>

      <section className="detail-hero">
        {currentPhoto && !photoBroken ? (
          <img src={currentPhoto} alt={carTitle} className="detail-hero-img" onError={() => setPhotoBroken(true)} />
        ) : (
          <img src="/fallback_car.png" alt="" className="detail-hero-fallback" />
        )}
        <div className="detail-hero-scrim" />
        <div className="detail-hero-copy">
          <span className="car-condition-badge">{conditionLabel}</span>
          <h1 className="car-title">{carTitle}</h1>
          <p className="car-subtitle">{carSubtitle}</p>
        </div>
      </section>
      {visiblePhotos.length > 1 && (
        <div className="gallery-thumbs-row">
          {visiblePhotos.map((photo) => {
            const url = carPhotoUrl(photo.filename, photo.subfolder)
            const isSelected = currentPhoto === url
            return (
              <button
                key={photo.id}
                className={`thumb-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setActivePhoto(url)
                  setPhotoBroken(false)
                }}
              >
                <img src={url} alt="صورة مصغرة للسيارة" />
              </button>
            )
          })}
        </div>
      )}

      <main className="detail-content">
        <section className="detail-story-col">
          <h2 className="section-label">عن هذه السيارة</h2>
          <p className="car-story-text">{story}</p>

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
            <div className="spec-card">
              <ShieldCheck />
              <div>
                <span>ناقل الحركة</span>
                <strong>{displayValue(transmissionLabel)}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className="detail-side-col">
          <div className="installment-note">
            <ShieldCheck />
            <div>
              <strong>مهتم بهذه السيارة؟</strong>
              <span>تواصل معنا لمعرفة السعر وخيارات التقسيط — دفعة أولى وأقساط شهرية حتى 10 أشهر.</span>
            </div>
            <button className="btn-solid-sm" onClick={() => setLeadOpen(true)}>
              استفسر الآن
            </button>
          </div>

          <div className="contact-box">
            <h3>للاستفسار المباشر والشراء</h3>
            {CONTACT_LINES.map((line) => (
              <div key={line.phone} className="phone-line">
                <Phone className="phone-icon" />
                <span className="phone-name">{line.name}:</span>
                <bdi className="phone-num">{line.phone}</bdi>
              </div>
            ))}
            <p className="showroom-address">
              <MapPin className="address-icon" />
              <span>{SHOWROOM_ADDRESS}</span>
            </p>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener" className="btn-whatsapp">
              <MessageCircle className="h-4 w-4" />
              تواصل عبر واتساب
            </a>
          </div>
        </aside>
      </main>

      {leadOpen && <LeadModal vehicle={car} onClose={() => setLeadOpen(false)} />}

      <DetailStyles />
    </div>
  )
}

function LeadModal({ vehicle, onClose }: { vehicle: CarType; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('يرجى إدخال الاسم ورقم الهاتف')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitVehicleLead({ name: name.trim(), phone: phone.trim(), vehicleId: String(vehicle.id) })
      setDone(true)
    } catch {
      setError('تعذر إرسال الطلب، يرجى المحاولة عبر واتساب')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lead-modal-overlay" onClick={onClose}>
      <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
        <button className="lead-modal-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
        {done ? (
          <div className="lead-success">
            <ShieldCheck />
            <h3>تم استلام طلبك</h3>
            <p>سيتواصل معك فريق المبيعات قريبًا لتزويدك بالسعر وكل التفاصيل.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>استفسار عن {vehicle.brand} {vehicle.model}</h3>
            <p>اترك رقمك وراح يتواصل معك فريق المبيعات لتزويدك بالسعر وتنسيق موعد معاينة.</p>
            <div className="lead-field">
              <label>الاسم</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك الكامل" />
            </div>
            <div className="lead-field">
              <label>رقم الهاتف</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxxx" dir="ltr" style={{ textAlign: 'right' }} />
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{error}</p>}
            <button className="lead-submit" type="submit" disabled={submitting}>
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function DetailStyles() {
  return (
    <style jsx global>{`
      :root {
        --st-bg: #0a0a0c;
        --st-surface: #141417;
        --st-surface-2: #1b1b1f;
        --st-border: rgba(255, 255, 255, 0.09);
        --st-ink: #ffffff;
        --st-muted: #9a9aa3;
        --st-accent: #3b6bf0;
        --st-accent-soft: rgba(59, 107, 240, 0.12);
      }
      .story-detail-shell {
        min-height: 100vh;
        background: var(--st-bg);
        font-family: var(--font-tajawal), 'Segoe UI', sans-serif;
        color: var(--st-ink);
        padding-bottom: 60px;
      }
      .state-container { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--st-muted); }
      .spin { width: 34px; height: 34px; animation: spin 1s linear infinite; color: var(--st-accent); }
      @keyframes spin { to { transform: rotate(360deg); } }
      .error-icon { width: 42px; height: 42px; color: #f87171; }

      .detail-header {
        display: flex; align-items: center; justify-content: space-between;
        background: rgba(10,10,12,.85); backdrop-filter: blur(10px); border-bottom: 1px solid var(--st-border);
        padding: 14px 40px; height: 72px; position: sticky; top: 0; z-index: 50;
      }
      .back-link { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #fff; transition: all 0.2s ease; }
      .back-link:hover { color: var(--st-accent); transform: translateX(3px); }
      .brand-logo { width: 46px; height: 36px; object-fit: contain; }

      .detail-hero { position: relative; height: 56vh; min-height: 380px; display: flex; align-items: flex-end; overflow: hidden; }
      .detail-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .detail-hero-fallback { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 60px; box-sizing: border-box; opacity: .4; background: var(--st-surface); }
      .detail-hero-scrim { position: absolute; inset: 0; background: linear-gradient(0deg, #0a0a0c 5%, rgba(10,10,12,.35) 55%, rgba(10,10,12,.1) 100%); }
      .detail-hero-copy { position: relative; z-index: 2; padding: 0 40px 40px; }
      .car-condition-badge { display: inline-block; background: var(--st-accent-soft); border: 1px solid rgba(59,107,240,.3); color: var(--st-accent); font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 99px; margin-bottom: 12px; }
      .car-title { font-size: clamp(28px, 4vw, 42px); font-weight: 900; margin: 0; line-height: 1.15; letter-spacing: -0.5px; }
      .car-subtitle { font-size: 15px; color: #d4d4d8; font-weight: 700; margin: 6px 0 0; }

      .gallery-thumbs-row { display: flex; gap: 8px; padding: 16px 40px; overflow-x: auto; }
      .thumb-btn { flex-shrink: 0; width: 88px; height: 64px; border-radius: 10px; border: 1.5px solid var(--st-border); overflow: hidden; padding: 0; background: var(--st-surface); cursor: pointer; transition: all 0.2s ease; }
      .thumb-btn img { width: 100%; height: 100%; object-fit: cover; }
      .thumb-btn:hover { border-color: rgba(255,255,255,.3); }
      .thumb-btn.selected { border-color: var(--st-accent); box-shadow: 0 0 0 2px var(--st-accent-soft); }

      .detail-content { max-width: 1200px; margin: 30px auto 0; padding: 0 40px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 44px; box-sizing: border-box; }
      .detail-story-col { display: flex; flex-direction: column; gap: 28px; }
      .section-label { font-size: 13px; font-weight: 800; color: var(--st-accent); text-transform: uppercase; letter-spacing: .5px; margin: 0; }
      .car-story-text { font-size: 15px; line-height: 2; color: #d4d4d8; margin: -14px 0 0; }

      .detail-specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .spec-card { background: var(--st-surface); border: 1px solid var(--st-border); border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease; }
      .spec-card:hover { border-color: rgba(59,107,240,.4); }
      .spec-card :global(svg) { width: 20px; height: 20px; color: var(--st-accent); flex-shrink: 0; }
      .spec-card div { display: flex; flex-direction: column; min-width: 0; }
      .spec-card span { font-size: 10px; font-weight: 700; color: var(--st-muted); }
      .spec-card strong { font-size: 13px; font-weight: 850; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .detail-side-col { display: flex; flex-direction: column; gap: 20px; }
      .installment-note { display: flex; flex-direction: column; gap: 14px; background: linear-gradient(135deg, var(--st-surface), var(--st-surface-2)); border: 1px solid var(--st-border); border-radius: 18px; padding: 22px; }
      .installment-note :global(> svg) { width: 24px; height: 24px; color: var(--st-accent); }
      .installment-note strong { display: block; font-size: 14px; font-weight: 800; color: #fff; }
      .installment-note span { display: block; font-size: 12px; color: var(--st-muted); margin-top: 6px; line-height: 1.7; }
      .btn-solid-sm { background: var(--st-accent); color: #fff; font-size: 12.5px; font-weight: 800; border: none; border-radius: 10px; padding: 12px 18px; cursor: pointer; transition: all 0.2s ease; }
      .btn-solid-sm:hover { background: #2e56cc; }
      .btn-outline-sm { font-size: 12.5px; font-weight: 800; color: #fff; background: var(--st-accent); border: none; border-radius: 99px; padding: 11px 22px; cursor: pointer; }

      .contact-box { background: var(--st-surface); border: 1px solid var(--st-border); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 10px; }
      .contact-box h3 { font-size: 14px; font-weight: 800; color: #fff; margin: 0 0 6px; }
      .phone-line { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; }
      .phone-icon { width: 14px; height: 14px; color: var(--st-accent); flex-shrink: 0; }
      .phone-name { color: var(--st-muted); }
      .phone-num { color: #fff; font-weight: 800; direction: ltr; }
      .showroom-address { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #d4d4d8; font-weight: 650; margin: 6px 0 4px; }
      .address-icon { width: 14px; height: 14px; color: var(--st-accent); flex-shrink: 0; }
      .btn-whatsapp { display: flex; align-items: center; justify-content: center; gap: 8px; background: #16a34a; color: #fff; font-weight: 800; height: 46px; font-size: 13px; border-radius: 12px; margin-top: 6px; transition: all 0.2s ease; }
      .btn-whatsapp:hover { opacity: .92; }

      .lead-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
      .lead-modal { background: var(--st-surface); border: 1px solid var(--st-border); border-radius: 22px; padding: 28px; width: 100%; max-width: 400px; position: relative; }
      .lead-modal-close { position: absolute; top: 18px; left: 18px; background: rgba(255,255,255,.06); border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
      .lead-modal h3 { font-size: 18px; font-weight: 900; margin: 0 0 6px; }
      .lead-modal p { font-size: 12.5px; color: var(--st-muted); margin: 0 0 20px; line-height: 1.6; }
      .lead-field { margin-bottom: 12px; }
      .lead-field label { display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px; }
      .lead-field input { width: 100%; box-sizing: border-box; background: var(--st-surface-2); border: 1.5px solid var(--st-border); border-radius: 10px; padding: 11px 14px; font-size: 13px; font-family: inherit; color: #fff; }
      .lead-field input:focus { outline: none; border-color: var(--st-accent); }
      .lead-submit { width: 100%; height: 48px; background: var(--st-accent); color: #fff; border: none; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; margin-top: 8px; transition: all .2s ease; }
      .lead-submit:hover { background: #2e56cc; }
      .lead-submit:disabled { opacity: .6; cursor: not-allowed; }
      .lead-success { text-align: center; padding: 10px 0; }
      .lead-success :global(svg) { width: 40px; height: 40px; color: #22c55e; margin-bottom: 10px; }

      @media (max-width: 1000px) {
        .detail-content { grid-template-columns: 1fr; gap: 32px; padding: 0 20px; }
        .detail-header { padding: 14px 20px; }
        .detail-hero-copy { padding: 0 20px 30px; }
        .gallery-thumbs-row { padding: 16px 20px; }
      }
      @media (max-width: 600px) {
        .car-title { font-size: 24px; }
        .detail-specs-grid { grid-template-columns: repeat(2, 1fr); }
      }
    `}</style>
  )
}
