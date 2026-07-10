'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Gauge,
  Settings,
  Fuel,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  CalendarClock,
  FileCheck2,
  MapPin,
  Phone,
  Clock3,
  MessageCircle,
  X,
} from 'lucide-react'
import { getPublicVehicles, submitVehicleLead, type Car as CarType, type CarsListResponse } from '@/lib/api/inventory'
import { formatNumber } from '@/lib/utils'

const FUEL_LABEL: Record<string, string> = { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' }
const TRANS_LABEL: Record<string, string> = { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' }
const CONDITION_LABEL: Record<string, string> = { New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة', Salvage: 'سكراب' }

const WHATSAPP_LINK = 'https://wa.me/9647719681434'
const CONTACT_LINES = [
  { name: 'أبو علي', phone: '07719681434' },
  { name: 'علي', phone: '07718752333' },
  { name: 'سجاد', phone: '07852525256' },
]
const ADDRESS_LINE = 'بغداد / الكريعات / شارع الوقف السني / قرب كلية القانون'

function carPhotoUrl(filename: string, subfolder = 'vehicles') {
  return `/static/uploads/${subfolder}/${filename}`
}

function carDescription(car: CarType): string {
  if (car.notes && car.notes.trim()) return car.notes.trim()
  const bits: string[] = []
  if (car.condition) bits.push(CONDITION_LABEL[car.condition] ?? car.condition)
  if (car.transmission) bits.push(`ناقل حركة ${TRANS_LABEL[car.transmission] ?? car.transmission}`)
  if (car.fuel_type) bits.push(`وقود ${FUEL_LABEL[car.fuel_type] ?? car.fuel_type}`)
  if (car.mileage != null) bits.push(`${formatNumber(car.mileage)} كم`)
  return bits.length ? `${car.brand} ${car.model} ${car.manufacturing_year} — ${bits.join('، ')}.` : `${car.brand} ${car.model} ${car.manufacturing_year}.`
}

export default function PublicShowroomPage() {
  const [brokenIds, setBrokenIds] = useState<Set<string | number>>(new Set())
  const [heroImgBroken, setHeroImgBroken] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadVehicle, setLeadVehicle] = useState<CarType | null>(null)

  const { data, isLoading } = useQuery<CarsListResponse>({
    queryKey: ['public-vehicles-story'],
    queryFn: () => getPublicVehicles({ page: 1, per_page: 24 }),
  })

  const cars = data?.items ?? []

  const markBroken = (id: string | number) =>
    setBrokenIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

  const heroCar = useMemo(() => {
    if (cars.length === 0) return null
    return [...cars].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })[0]
  }, [cars])

  const heroCover = heroCar?.cover_photo
  const heroHasPhoto = !!heroCover && !heroImgBroken

  const openLead = (vehicle?: CarType) => {
    setLeadVehicle(vehicle ?? null)
    setLeadOpen(true)
  }

  return (
    <div className="story-container" dir="rtl">
      <header className="story-header">
        <div className="story-brand">
          <img src="/logo.png" alt="معرض الأصدقاء" className="story-logo" />
          <div>
            <h1>شركة الأصدقاء لتجارة السيارات</h1>
          </div>
        </div>
        <nav className="header-links">
          <a href="#top">الرئيسية</a>
          <a href="#cars">سياراتنا</a>
          <a href="#vision">من نحن</a>
          <a href="#visit">تواصل معنا</a>
        </nav>
        <Link href="/login" className="admin-login-link">
          دخول الموظفين
        </Link>
      </header>

      {/* Cinematic hero */}
      <section className="hero-cinematic" id="top">
        {heroHasPhoto && (
          <img
            className="hero-bg-photo"
            src={carPhotoUrl(heroCover!.filename, heroCover!.subfolder)}
            alt=""
            onError={() => setHeroImgBroken(true)}
          />
        )}
        <div className="hero-scrim" />
        <div className="hero-inner">
          <h1>
            تجربة شراء سيارة
            <br />
            بمستوى جديد
          </h1>
          <p className="hero-lead">
            نستورد كل سيارة ونفحصها فنيًا بعناية قبل وصولها لصالة العرض، ونمنحك خيار التقسيط
            المريح حتى عشرة أشهر بثقة الأصدقاء.
          </p>
          <div className="hero-ctas">
            <a href="#cars" className="btn-outline">
              تصفّح سياراتنا
            </a>
            <button className="btn-solid" onClick={() => openLead()}>
              تواصل معنا
            </button>
          </div>
        </div>
        <div className="hero-scroll-hint" />
      </section>

      {/* Vision */}
      <section className="vision-section" id="vision">
        <h2>رؤيتنا</h2>
        <p>
          أن نكون الوجهة الرائدة في العراق لبيع السيارات وخدمات ما بعد البيع، عبر توفير أحدث
          الطرازات العالمية بأسعار منافسة وحلول تقسيط شاملة ترفع تجربة العميل إلى مستويات جديدة
          من الراحة والاطمئنان.
        </p>
        <p>
          نفحص كل سيارة فنيًا قبل عرضها، ونوثّق كل عملية بيع بعقد رسمي — مع الحفاظ على أعلى درجات
          الشفافية والاحترافية في كل تعامل.
        </p>
      </section>

      {/* Selected cars — editorial storytelling blocks */}
      <section className="cars-story" id="cars">
        <div className="story-heading">
          <span className="dash-title">سياراتنا المختارة</span>
        </div>

        {isLoading ? (
          <div className="story-loading">
            <Loader2 className="story-spin" />
            <p>جاري تحميل السيارات...</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="story-empty">
            <p>لا توجد سيارات معروضة حاليًا، تابعونا قريبًا لأحدث الوصولات</p>
          </div>
        ) : (
          cars.map((car, index) => {
            const cover = car.cover_photo
            const showPhoto = !!cover && !brokenIds.has(car.id)
            const carTitle = `${car.brand} ${car.model}`
            const reversed = index % 2 === 1

            return (
              <article key={car.id} className={`car-story-block ${reversed ? 'reversed' : ''}`}>
                <div className="car-story-photo">
                  {showPhoto ? (
                    <img
                      src={carPhotoUrl(cover!.filename, cover!.subfolder)}
                      alt={carTitle}
                      onError={() => markBroken(car.id)}
                    />
                  ) : (
                    <img src="/fallback_car.png" alt="" className="car-story-fallback" />
                  )}
                </div>
                <div className="car-story-copy">
                  <h3>{carTitle}</h3>
                  <span className="car-story-tag">
                    {car.condition ? (CONDITION_LABEL[car.condition] ?? car.condition) : 'متوفرة'}
                  </span>
                  <p>{carDescription(car)}</p>
                  <div className="car-story-specs">
                    {car.mileage != null && (
                      <span className="spec-pill">
                        <Gauge className="h-3.5 w-3.5" /> {formatNumber(car.mileage)} كم
                      </span>
                    )}
                    {car.transmission && (
                      <span className="spec-pill">
                        <Settings className="h-3.5 w-3.5" /> {TRANS_LABEL[car.transmission] ?? car.transmission}
                      </span>
                    )}
                    {car.fuel_type && (
                      <span className="spec-pill">
                        <Fuel className="h-3.5 w-3.5" /> {FUEL_LABEL[car.fuel_type] ?? car.fuel_type}
                      </span>
                    )}
                  </div>
                  <div className="car-story-actions">
                    <button className="btn-outline-sm" onClick={() => openLead(car)}>
                      تواصل للاستفسار
                    </button>
                    <Link href={`/showroom/${car.id}`} className="btn-link-sm">
                      التفاصيل الكاملة
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>

      {/* Trust / why us */}
      <section className="trust-section" id="why-us">
        <span className="tag-pill">لماذا الأصدقاء</span>
        <h2>ثقة تُبنى بالتفاصيل، لا بالوعود</h2>
        <div className="trust-grid">
          <div className="trust-card">
            <FileCheck2 />
            <strong>فحص وتوثيق</strong>
            <span>كل سيارة تُفحص فنيًا وتُوثّق بالكامل قبل عرضها للبيع</span>
          </div>
          <div className="trust-card">
            <CalendarClock />
            <strong>تقسيط مرن</strong>
            <span>دفعة أولى مناسبة وأقساط شهرية تصل إلى عشرة أشهر</span>
          </div>
          <div className="trust-card">
            <ShieldCheck />
            <strong>عقد رسمي</strong>
            <span>عقد بيع موثّق يحفظ حقوق الطرفين في كل صفقة</span>
          </div>
        </div>
      </section>

      {/* Visit / footer */}
      <footer className="story-footer" id="visit">
        <div className="footer-top">
          <div className="footer-contact">
            <h3>تواصل معنا</h3>
            {CONTACT_LINES.map((line) => (
              <div className="visit-row" key={line.phone}>
                <Phone />
                <span>
                  {line.name}: <bdi className="ltr-nums">{line.phone}</bdi>
                </span>
              </div>
            ))}
            <div className="visit-row">
              <MapPin />
              <span>{ADDRESS_LINE}</span>
            </div>
            <div className="visit-row">
              <Clock3 />
              <span>يوميًا 9 صباحًا – 8 مساءً</span>
            </div>
          </div>
          <div className="footer-links">
            <h3>روابط سريعة</h3>
            <a href="#top">الرئيسية</a>
            <a href="#cars">سياراتنا</a>
            <a href="#vision">رؤيتنا</a>
            <Link href="/login">دخول الموظفين</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 شركة الأصدقاء لتجارة السيارات الحديثة — جميع الحقوق محفوظة</span>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a href={WHATSAPP_LINK} target="_blank" rel="noopener" className="whatsapp-float" aria-label="تواصل عبر واتساب">
        <MessageCircle className="h-6 w-6" />
      </a>

      {leadOpen && <LeadModal vehicle={leadVehicle} onClose={() => setLeadOpen(false)} />}

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
        .story-container {
          min-height: 100vh;
          background: var(--st-bg);
          font-family: var(--font-tajawal), 'Segoe UI', sans-serif;
          color: var(--st-ink);
        }
        .ltr-nums { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }

        .story-header {
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
          background: rgba(10, 10, 12, 0.85); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--st-border);
          padding: 14px 40px; height: 74px; position: sticky; top: 0; z-index: 100;
        }
        .story-brand { display: flex; align-items: center; gap: 14px; }
        .story-logo { height: 36px; width: 46px; object-fit: contain; }
        .story-brand h1 { font-size: 15px; font-weight: 800; margin: 0; color: #fff; white-space: nowrap; }
        .header-links { display: flex; align-items: center; gap: 28px; }
        .header-links a { font-size: 13px; font-weight: 700; color: var(--st-muted); transition: color .2s ease; }
        .header-links a:hover { color: #fff; }
        .admin-login-link {
          font-size: 12px; font-weight: 700; color: #fff;
          border: 1.5px solid var(--st-border); border-radius: 10px;
          padding: 8px 16px; transition: all 0.2s ease; white-space: nowrap;
        }
        .admin-login-link:hover { background: rgba(255,255,255,.05); }

        /* Hero */
        .hero-cinematic {
          position: relative; min-height: 92vh;
          display: flex; align-items: flex-end; overflow: hidden;
          padding: 40px 60px 100px;
        }
        .hero-bg-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 40%; }
        .hero-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(0deg, #0a0a0c 8%, rgba(10,10,12,.55) 45%, rgba(10,10,12,.25) 70%, rgba(10,10,12,.55) 100%);
        }
        .hero-inner { position: relative; z-index: 2; max-width: 720px; }
        .hero-inner h1 { font-size: clamp(2.2rem, 5vw, 3.6rem); font-weight: 900; line-height: 1.2; margin: 0; letter-spacing: -0.5px; }
        .hero-lead { font-size: 15px; color: #d4d4d8; line-height: 1.8; margin: 22px 0 0; max-width: 50ch; }
        .hero-ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
        .btn-solid, .btn-outline {
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; padding: 14px 30px; border-radius: 99px;
          transition: all .2s ease; white-space: nowrap; cursor: pointer; border: none;
        }
        .btn-solid { background: var(--st-accent); color: #fff; }
        .btn-solid:hover { background: #2e56cc; }
        .btn-outline { border: 1.5px solid rgba(255,255,255,.35); color: #fff; background: transparent; }
        .btn-outline:hover { border-color: rgba(255,255,255,.6); background: rgba(255,255,255,.06); }
        .hero-scroll-hint { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); width: 1px; height: 40px; background: linear-gradient(180deg, transparent, rgba(255,255,255,.4)); }

        /* Vision */
        .vision-section {
          max-width: 760px; margin: 0 auto; padding: 120px 40px; text-align: center;
        }
        .vision-section h2 { font-size: 34px; font-weight: 900; margin: 0 0 30px; }
        .vision-section p { font-size: 15px; line-height: 2; color: #cfcfd4; margin: 0 0 20px; }

        /* Cars story */
        .cars-story { max-width: 1200px; margin: 0 auto; padding: 40px 40px 100px; }
        .story-heading { text-align: center; margin-bottom: 70px; }
        .dash-title {
          font-size: 26px; font-weight: 900; color: #fff; position: relative; padding: 0 30px;
          display: inline-block;
        }
        .dash-title::before, .dash-title::after {
          content: ""; position: absolute; top: 50%; width: 22px; height: 1px; background: rgba(255,255,255,.3);
        }
        .dash-title::before { right: 0; }
        .dash-title::after { left: 0; }

        .story-loading, .story-empty { text-align: center; color: var(--st-muted); padding: 60px 0; }
        .story-spin { width: 32px; height: 32px; animation: spin 1s linear infinite; color: var(--st-accent); margin: 0 auto 12px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .car-story-block {
          display: grid; grid-template-columns: 1.1fr 1fr; gap: 50px; align-items: center;
          background: var(--st-surface); border: 1px solid var(--st-border); border-radius: 24px;
          overflow: hidden; margin-bottom: 30px;
        }
        .car-story-block.reversed { grid-template-columns: 1fr 1.1fr; }
        .car-story-block.reversed .car-story-photo { order: 2; }
        .car-story-block.reversed .car-story-copy { order: 1; }
        .car-story-photo { height: 340px; background: var(--st-surface-2); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .car-story-photo img { width: 100%; height: 100%; object-fit: cover; }
        .car-story-fallback { width: 60% !important; height: 60% !important; object-fit: contain !important; opacity: .45; }
        .car-story-copy { padding: 20px 44px 20px 8px; }
        .car-story-block.reversed .car-story-copy { padding: 20px 8px 20px 44px; }
        .car-story-copy h3 { font-size: 26px; font-weight: 900; margin: 0 0 10px; }
        .car-story-tag {
          display: inline-block; font-size: 11px; font-weight: 800; color: var(--st-accent);
          background: var(--st-accent-soft); border-radius: 99px; padding: 4px 14px; margin-bottom: 16px;
        }
        .car-story-copy p { font-size: 13.5px; line-height: 1.9; color: #c6c6cc; margin: 0 0 20px; }
        .car-story-specs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .spec-pill {
          display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700;
          color: #d4d4d8; background: rgba(255,255,255,.05); border: 1px solid var(--st-border);
          border-radius: 99px; padding: 6px 12px;
        }
        .spec-pill :global(svg) { color: var(--st-accent); }
        .car-story-actions { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
        .btn-outline-sm {
          font-size: 12.5px; font-weight: 800; color: #fff; background: var(--st-accent);
          border: none; border-radius: 99px; padding: 11px 22px; cursor: pointer; transition: all .2s ease;
        }
        .btn-outline-sm:hover { background: #2e56cc; }
        .btn-link-sm { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 800; color: #fff; }
        .btn-link-sm:hover { color: var(--st-accent); }

        /* Trust */
        .trust-section { max-width: 1100px; margin: 0 auto; padding: 40px 40px 120px; text-align: center; }
        .tag-pill { display: inline-block; font-size: 11px; font-weight: 800; color: var(--st-accent); background: var(--st-accent-soft); border-radius: 99px; padding: 5px 16px; margin-bottom: 18px; }
        .trust-section h2 { font-size: 30px; font-weight: 900; margin: 0 0 50px; }
        .trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; text-align: right; }
        .trust-card { background: var(--st-surface); border: 1px solid var(--st-border); border-radius: 18px; padding: 28px; }
        .trust-card :global(svg) { width: 26px; height: 26px; color: var(--st-accent); margin-bottom: 16px; }
        .trust-card strong { display: block; font-size: 15px; font-weight: 800; margin-bottom: 8px; }
        .trust-card span { display: block; font-size: 12.5px; color: var(--st-muted); line-height: 1.7; }

        /* Footer */
        .story-footer { background: var(--st-surface); border-top: 1px solid var(--st-border); padding: 60px 40px 0; }
        .footer-top { max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; gap: 60px; flex-wrap: wrap; padding-bottom: 40px; }
        .footer-contact h3, .footer-links h3 { font-size: 15px; font-weight: 800; margin: 0 0 18px; }
        .visit-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #c6c6cc; font-weight: 600; margin-bottom: 12px; }
        .visit-row :global(svg) { width: 16px; height: 16px; color: var(--st-accent); flex-shrink: 0; }
        .footer-links { display: flex; flex-direction: column; gap: 10px; }
        .footer-links a { font-size: 13px; color: #c6c6cc; font-weight: 600; }
        .footer-links a:hover { color: #fff; }
        .footer-bottom { max-width: 1100px; margin: 0 auto; border-top: 1px solid var(--st-border); padding: 22px 0; text-align: center; }
        .footer-bottom span { font-size: 12px; color: var(--st-muted); }

        /* WhatsApp float */
        .whatsapp-float {
          position: fixed; bottom: 24px; left: 24px; z-index: 150;
          width: 54px; height: 54px; border-radius: 50%; background: #16a34a;
          display: flex; align-items: center; justify-content: center; color: #fff;
          box-shadow: 0 10px 24px rgba(22,163,74,.4); transition: transform .2s ease;
        }
        .whatsapp-float:hover { transform: scale(1.08); }

        /* Lead modal */
        .lead-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
        .lead-modal { background: var(--st-surface); border: 1px solid var(--st-border); border-radius: 22px; padding: 28px; width: 100%; max-width: 400px; position: relative; }
        .lead-modal-close { position: absolute; top: 18px; left: 18px; background: rgba(255,255,255,.06); border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
        .lead-modal h3 { font-size: 18px; font-weight: 900; margin: 0 0 6px; }
        .lead-modal p { font-size: 12.5px; color: var(--st-muted); margin: 0 0 20px; line-height: 1.6; }
        .lead-field { margin-bottom: 12px; }
        .lead-field label { display: block; font-size: 12px; font-weight: 800; margin-bottom: 6px; }
        .lead-field input, .lead-field textarea {
          width: 100%; box-sizing: border-box; background: var(--st-surface-2); border: 1.5px solid var(--st-border);
          border-radius: 10px; padding: 11px 14px; font-size: 13px; font-family: inherit; color: #fff;
        }
        .lead-field input:focus, .lead-field textarea:focus { outline: none; border-color: var(--st-accent); }
        .lead-submit {
          width: 100%; height: 48px; background: var(--st-accent); color: #fff; border: none; border-radius: 12px;
          font-size: 13px; font-weight: 800; cursor: pointer; margin-top: 8px; transition: all .2s ease;
        }
        .lead-submit:hover { background: #2e56cc; }
        .lead-submit:disabled { opacity: .6; cursor: not-allowed; }
        .lead-success { text-align: center; padding: 10px 0; }
        .lead-success :global(svg) { width: 40px; height: 40px; color: #22c55e; margin-bottom: 10px; }

        @media (max-width: 1100px) {
          .header-links { display: none; }
          .car-story-block, .car-story-block.reversed { grid-template-columns: 1fr; }
          .car-story-block .car-story-photo, .car-story-block.reversed .car-story-photo { order: 1; height: 280px; }
          .car-story-block .car-story-copy, .car-story-block.reversed .car-story-copy { order: 2; padding: 8px 28px 32px; }
          .trust-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .story-header { padding: 14px 20px; }
          .hero-cinematic { padding: 30px 24px 70px; min-height: 80vh; }
          .vision-section { padding: 80px 24px; }
          .cars-story { padding: 20px 20px 70px; }
          .trust-section { padding: 20px 20px 80px; }
          .footer-top { padding-bottom: 30px; }
        }
      `}</style>
    </div>
  )
}

function LeadModal({ vehicle, onClose }: { vehicle: CarType | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
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
      await submitVehicleLead({
        name: name.trim(),
        phone: phone.trim(),
        vehicleId: vehicle ? String(vehicle.id) : undefined,
        message: message.trim() || undefined,
      })
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
            <p>سيتواصل معك فريق المبيعات قريبًا لتزويدك بكل التفاصيل بما فيها السعر.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>{vehicle ? `استفسار عن ${vehicle.brand} ${vehicle.model}` : 'تواصل معنا'}</h3>
            <p>اترك رقمك وراح يتواصل معك فريق المبيعات لتزويدك بالسعر وكل التفاصيل.</p>
            <div className="lead-field">
              <label>الاسم</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك الكامل" />
            </div>
            <div className="lead-field">
              <label>رقم الهاتف</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxxx" dir="ltr" style={{ textAlign: 'right' }} />
            </div>
            <div className="lead-field">
              <label>ملاحظة (اختياري)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="أي تفاصيل إضافية..." />
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
