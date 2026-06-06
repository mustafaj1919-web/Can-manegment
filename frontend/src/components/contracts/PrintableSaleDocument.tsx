'use client'

/**
 * PrintableSaleDocument — Arabic A4 paper contract
 * Used by /sales/[id]/receipt and /sales/[id]/contract
 */

import React from 'react'
import { SHOWROOM } from '@/lib/showroom-config'
import type { SaleDetail } from '@/lib/api/sales'
import type { Car } from '@/lib/api/inventory'
import type { Customer, CustomerDocument } from '@/lib/api/customers'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

export function photoUrl(filename: string, subfolder = '') {
  return subfolder
    ? `/static/uploads/${subfolder}/${filename}`
    : `/static/uploads/${filename}`
}

function fmtDate(val?: string | null): string | null {
  if (!val) return null
  try {
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(val))
  } catch { return val }
}

function fmtMoney(amount: number | null | undefined, currency: string): string | null {
  if (amount == null) return null
  const n = Number(amount)
  const fmt = (n % 1 !== 0)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-US')
  return currency === 'IQD' ? `${fmt} د.ع` : `$ ${fmt}`
}

const AR: Record<string, Record<string, string>> = {
  fuel:  { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' },
  trans: { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' },
  cond:  { New: 'جديد', Used: 'مستعمل', Damaged: 'متضرر', Salvage: 'خردة' },
  plate: { 'No Plate': 'بدون لوحة', Temporary: 'مؤقتة', Registered: 'مسجلة' },
  pay:   { Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة مصرفية' },
}
const tr = (dict: string, key?: string | null) => (key ? (AR[dict][key] ?? key) : null)

/* ─── FormLine: paper dotted-line field ──────────────────────────────────── */

function FL({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value == null || value === ''
  return (
    <div className="fl">
      <span className="fl-lbl">{label}</span>
      <span className="fl-col">:</span>
      {empty
        ? <span className="fl-line" />
        : <span className="fl-val">{value}</span>}
    </div>
  )
}

/* ─── Inline spec field (inside agreement text) ──────────────────────────── */

function SF({ label, value }: { label: string; value?: string | number | null }) {
  const empty = value == null || value === ''
  return (
    <span className="sf">
      <span className="sf-lbl">{label}:</span>
      {empty
        ? <span className="sf-line" />
        : <span className="sf-val">{value}</span>}
    </span>
  )
}

/* ─── Document image box ─────────────────────────────────────────────────── */

function DocBox({ doc, label }: { doc?: CustomerDocument; label: string }) {
  const src = doc ? photoUrl(doc.filename, 'customers') : undefined
  return (
    <div className="dbox">
      {src && (
        <img
          src={src}
          alt={label}
          className="dbox-img"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const ph = e.currentTarget.nextElementSibling as HTMLElement | null
            if (ph) ph.style.display = 'flex'
          }}
        />
      )}
      <div className="dbox-ph" style={src ? { display: 'none' } : {}}>
        <span>لا صورة</span>
      </div>
      <p className="dbox-lbl">{label}</p>
    </div>
  )
}

/* ─── Section header bar ─────────────────────────────────────────────────── */

function SH({ children }: { children: React.ReactNode }) {
  return <div className="sh">{children}</div>
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

export interface PrintableSaleDocumentProps {
  sale: SaleDetail
  fullCar?: Car | null
  fullBuyer?: Customer | null
  mode?: 'receipt' | 'contract'
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function PrintableSaleDocument({ sale, fullCar, fullBuyer, mode = 'receipt' }: PrintableSaleDocumentProps) {
  const c = (fullCar ?? sale.car) as Car | null
  const photos = fullCar?.photos ?? []
  const docs: CustomerDocument[] = fullBuyer?.documents ?? []

  const buyerName    = fullBuyer?.full_name ?? fullBuyer?.name ?? sale.buyer?.name ?? null
  const buyerPhone   = fullBuyer?.phone    ?? sale.buyer?.phone ?? null
  const buyerIdNum   = fullBuyer?.id_number ?? sale.buyer?.id_number ?? null
  const buyerAddress = fullBuyer?.address  ?? sale.buyer?.address ?? null

  const repName    = sale.sales_rep_name    ?? SHOWROOM.nameShort
  const repPhone   = sale.sales_rep_phone   ?? SHOWROOM.phones[0]
  const repIdNum   = sale.sales_rep_id_number ?? null
  const repTitle   = sale.sales_rep_title   ?? 'موظف مبيعات'
  const repAddress = sale.sales_rep_address ?? 'بغداد — العراق'

  const netTotal   = (sale.selling_price ?? 0) - (sale.discount ?? 0)
  const getDoc     = (t: string) => docs.find(d => d.document_type === t)
  const extraDocs  = docs.filter(d => d.document_type === 'document_photo')

  const fuel    = tr('fuel',  c?.fuel_type)
  const trans   = tr('trans', c?.transmission)
  const cond    = tr('cond',  c?.condition)
  const plateSt = tr('plate', c?.plate_status)

  const remainingText = sale.remaining_amount > 0
    ? fmtMoney(sale.remaining_amount, sale.currency)
    : 'مسدد بالكامل'

  if (mode === 'receipt') {
    return (
      <div className="wr-page" dir="rtl">
        <div className="wr-watermark">{SHOWROOM.nameShort}</div>

        <div className="wr-header">
          <div className="wr-brand-mark">
            <img src="/logo.png" alt="شعار المعرض" />
          </div>

          <div className="wr-title-block">
            <p className="wr-en">ALASDIQAA EXHIBITION</p>
            <p className="wr-en wr-en-sub">For Trading Car</p>
            <p className="wr-no">№ {sale.invoice_number}</p>
            <p className="wr-ar">{SHOWROOM.name}</p>
            <p className="wr-ar-sub">لتجارة السيارات الحديثة</p>
          </div>

          <div className="wr-contact">
            {SHOWROOM.phones.slice(0, 3).map((phone, index) => (
              <p key={phone}>
                <span>{index === 0 ? 'بإدارة أبو علي' : index === 1 ? 'علي' : 'سجاد'}</span>
                <b dir="ltr">{phone}</b>
              </p>
            ))}
            <div className="wr-auto-logos">
              <span>KIA</span>
              <span>HYUNDAI</span>
            </div>
          </div>
        </div>

        <div className="wr-address">
          <span>{SHOWROOM.address}</span>
          <span dir="ltr">{SHOWROOM.addressEn}</span>
        </div>

        <section className="wr-parties">
          <div className="wr-party">
            <div className="wr-pill">الطرف الثاني (المشتري)</div>
            <div className="wr-field"><b>الاسم</b><span>{buyerName}</span></div>
            <div className="wr-field"><b>السكن</b><span>{buyerAddress}</span></div>
            <div className="wr-field"><b>العنوان</b><span>{buyerAddress}</span></div>
            <div className="wr-field"><b>المهنة</b><span /></div>
            <div className="wr-field"><b>هوية التعريف</b><span>{buyerIdNum}</span></div>
            <div className="wr-field"><b>رقم الموبايل</b><span>{buyerPhone}</span></div>
          </div>

          <div className="wr-party">
            <div className="wr-pill">الطرف الأول (البائع المعرض)</div>
            <div className="wr-field"><b>الاسم</b><span>{repName}</span></div>
            <div className="wr-field"><b>السكن</b><span>{repAddress}</span></div>
            <div className="wr-field"><b>العنوان</b><span>{SHOWROOM.address}</span></div>
            <div className="wr-field"><b>المهنة</b><span>{repTitle}</span></div>
            <div className="wr-field"><b>هوية التعريف</b><span>{repIdNum}</span></div>
            <div className="wr-field"><b>رقم الموبايل</b><span>{repPhone}</span></div>
          </div>
        </section>

        <main className="wr-body">
          <h2>عقد هذا الاتفاق بين الطرفين كما يلي :</h2>
          <div className="wr-line"><b>باع الطرف الأول للطرف الثاني السيارة المرقمة</b><span /></div>
          <div className="wr-specs">
            <div className="wr-line"><b>من نوع</b><span>{c?.brand}</span></div>
            <div className="wr-line"><b>موديل</b><span>{c?.model}</span></div>
            <div className="wr-line"><b>لونها</b><span>{c?.color}</span></div>
            <div className="wr-line"><b>رقم السنوية</b><span>{c?.plate_number}</span></div>
          </div>
          <div className="wr-line"><b>رقم الشاصي</b><span>{c?.vin}</span></div>
          <div className="wr-line"><b>رقم المحرك</b><span>{c?.engine_size}</span></div>
          <div className="wr-line"><b>بمبلغ قدره</b><span>{fmtMoney(netTotal, sale.currency)}</span></div>
          <div className="wr-line"><b>وقد قبض البائع مبلغاً قدره</b><span>{fmtMoney(sale.paid_amount, sale.currency)}</span></div>
          <div className="wr-line"><b>والباقي قدره</b><span>{remainingText}</span></div>
          <div className="wr-line"><b>ملاحظات</b><span>{sale.payments?.[0]?.notes}</span></div>
          <div className="wr-line"><b>البائع الحاضر</b><span>{repName}</span><em>م</em><span /><em>ز</em><span /><em>د</em><span /><em>موبايل</em><span>{repPhone}</span></div>
        </main>

        <section className="wr-terms">
          <ol>
            <li>يتعهد البائع بتحويل السيارة في دائرة المرور عند المباشرة بالتحويل.</li>
            <li>على المشتري فحص السيارة قبل الشراء، ويكون المعرض غير مسؤول بعد توقيع العقد.</li>
            <li>إذا أخل أحد الطرفين بالاتفاق يدفع للطرف الآخر تعويضاً قدره 20% من قيمة السيارة.</li>
            <li>دور المعرض ينحصر بالتوفيق بين البائع والمشتري وبموافقة الطرفين على تفاصيل البيع.</li>
            <li>ينتهي دور المعرض عند توقيع الطرفين، والبائع مسؤول عن مطابقة رقم الشاصي والمحرك والسنوية.</li>
            <li>استلم الطرف الثاني السيارة المذكورة أعلاه وهو مسؤول عنها من تاريخ العقد.</li>
          </ol>
          <p className="wr-warning">ملاحظة: العربون غير قابل للاسترجاع، وكل عقد غير مختوم بختم المعرض يعتبر باطلاً.</p>
        </section>

        <div className="wr-date">
          <span>نظمت بثلاث نسخ تعطى لمن يهمه الأمر تحريراً بتاريخ</span>
          <b>{fmtDate(sale.sale_date)}</b>
          <span>في الساعة</span>
          <b />
        </div>

        <div className="wr-signatures">
          <div>
            <b>التوقيع</b>
            <span>عن إقرار الطرف الثاني (مشتري السيارة)</span>
          </div>
          <div>
            <b>منظم العقد</b>
          </div>
          <div>
            <b>التوقيع</b>
            <span>عن إقرار الطرف الأول (بائع السيارة)</span>
          </div>
        </div>

        <style jsx global>{`
          .wr-page {
            --wr-blue: #2d2f73;
            --wr-gold: #b89a25;
            --wr-ink: #2f3565;
            position: relative;
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 4mm 12mm 7mm;
            background: #fffdf7;
            color: var(--wr-ink);
            border: 1px solid #ddd7c7;
            box-shadow: 0 10px 34px rgba(0, 0, 0, .24);
            overflow: hidden;
            font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
            display: flex;
            flex-direction: column;
          }
          .wr-watermark {
            position: absolute;
            inset: 76mm 0 auto;
            text-align: center;
            color: var(--wr-blue);
            opacity: .08;
            font-size: 124px;
            font-weight: 900;
            line-height: 1;
            transform: rotate(-12deg);
            pointer-events: none;
            z-index: 0;
          }
          .wr-page > *:not(style):not(.wr-watermark) { position: relative; z-index: 1; }
          .wr-header {
            display: grid;
            grid-template-columns: 34mm 1fr 55mm;
            align-items: start;
            gap: 5mm;
            min-height: 29mm;
            flex: 0 0 auto;
          }
          .wr-brand-mark img {
            width: 28mm;
            height: 22mm;
            object-fit: contain;
            filter: sepia(1) saturate(1.7) hue-rotate(5deg);
          }
          .wr-title-block { text-align: center; color: var(--wr-gold); font-weight: 900; }
          .wr-title-block p { margin: 0; }
          .wr-en { direction: ltr; font-family: Georgia, serif; font-size: 15px; letter-spacing: .3px; }
          .wr-en-sub { font-size: 13px; }
          .wr-no { color: #2d304d; font-size: 15px; margin-top: .5mm !important; }
          .wr-ar { font-size: 13px; margin-top: .5mm !important; }
          .wr-ar-sub { font-size: 11.5px; }
          .wr-contact { color: var(--wr-gold); font-size: 12.5px; font-weight: 800; }
          .wr-contact p { display: flex; justify-content: space-between; gap: 4mm; margin: 0 0 1mm; }
          .wr-contact b { font-size: 15px; line-height: 1; }
          .wr-auto-logos { display: flex; justify-content: flex-end; gap: 5mm; margin-top: 1.5mm; font-size: 20px; color: #6f5d18; letter-spacing: 0; }
          .wr-address {
            display: flex;
            justify-content: center;
            gap: 9mm;
            color: var(--wr-gold);
            font-size: 11px;
            font-weight: 900;
            margin-top: -1mm;
            margin-bottom: 4mm;
            flex: 0 0 auto;
          }
          .wr-parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10mm;
            margin-bottom: 4mm;
            flex: 0 0 auto;
          }
          .wr-parties .wr-party:first-child { order: 2; }
          .wr-parties .wr-party:last-child { order: 1; }
          .wr-party {
            position: relative;
            border: 1.3px solid #777aa6;
            border-radius: 8px;
            padding: 7mm 4mm 2.5mm;
            min-height: 44mm;
          }
          .wr-pill {
            position: absolute;
            top: -4mm;
            right: 24mm;
            left: 24mm;
            height: 8mm;
            border-radius: 999px;
            background: var(--wr-blue);
            color: #f2dd6c;
            text-align: center;
            font-size: 12px;
            font-weight: 900;
            line-height: 8mm;
          }
          .wr-field,
          .wr-line {
            display: flex;
            align-items: flex-end;
            gap: 2mm;
            min-height: 7.6mm;
            font-size: 11.5px;
            font-weight: 800;
          }
          .wr-field b,
          .wr-line b {
            min-width: max-content;
            color: var(--wr-ink);
          }
          .wr-field b::after,
          .wr-line b::after { content: " :"; }
          .wr-field span,
          .wr-line span,
          .wr-date b {
            flex: 1;
            min-height: 5mm;
            padding: 0 2mm;
            border-bottom: 1.7px dotted #8f8f9f;
            color: #242845;
            font-size: 11.5px;
            font-weight: 900;
          }
          .wr-body {
            margin-top: 0;
            flex: 1 1 auto;
          }
          .wr-body h2 {
            margin: 0 0 2mm;
            text-align: right;
            color: var(--wr-blue);
            font-size: 16px;
            line-height: 1.2;
            font-weight: 900;
          }
          .wr-specs {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            column-gap: 4mm;
          }
          .wr-line em {
            color: var(--wr-blue);
            font-style: normal;
            font-weight: 900;
          }
          .wr-terms {
            margin-top: 2mm;
            border-top: 2.5px solid var(--wr-blue);
            padding-top: 2mm;
            flex: 0 0 auto;
          }
          .wr-terms ol {
            margin: 0;
            padding: 0 6mm 0 0;
            color: var(--wr-blue);
            font-size: 10px;
            line-height: 1.45;
            font-weight: 800;
          }
          .wr-warning {
            width: fit-content;
            max-width: 82%;
            margin: 1.5mm auto 0;
            padding: 1mm 4mm;
            border-radius: 999px;
            background: var(--wr-blue);
            color: #f2dd6c;
            font-size: 11px;
            font-weight: 900;
            text-align: center;
          }
          .wr-date {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 3mm;
            margin-top: 2mm;
            color: var(--wr-blue);
            font-size: 12px;
            font-weight: 800;
          }
          .wr-date b { flex: 0 0 34mm; text-align: center; }
          .wr-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10mm;
            margin-top: 6mm;
            text-align: center;
            color: var(--wr-blue);
            font-size: 12px;
            font-weight: 900;
            flex: 0 0 auto;
          }
          .wr-signatures div {
            min-height: 22mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            gap: 2mm;
          }
          .wr-signatures span { font-size: 11px; }
          @media print {
            @page { size: A4 portrait; margin: 0; }
            aside, header, nav,
            [class*="toolbar"], [class*="Toolbar"],
            [class*="topbar"], [class*="Topbar"],
            [class*="sidebar"], [class*="Sidebar"],
            [data-radix-scroll-area-viewport],
            .print\\:hidden,
            [class*="receipt-toolbar"],
            [class*="contract-toolbar"] { display: none !important; }
            html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .wr-page {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 1.5mm 12mm 6mm !important;
              overflow: hidden !important;
              box-shadow: none !important;
              border: none !important;
              justify-content: flex-start !important;
            }
            .wr-header {
              margin-top: 0 !important;
              min-height: 26mm !important;
            }
            .wr-address {
              margin-top: -2mm !important;
              margin-bottom: 2.5mm !important;
            }
            [class*="receipt-shell"],
            [class*="contract-shell"] {
              background: white !important;
              padding: 0 !important;
              min-height: unset !important;
            }
          }
        `}</style>
      </div>
    )
  }

  const docTitle = 'عقد بيع مركبة'

  return (
    <div className="pc" dir="rtl">

      {/* ══════════════════════════ HEADER ══════════════════════════════ */}
      {/*
       *  Physical layout (LTR coordinates):
       *  LEFT: phone numbers  |  CENTER: logo + name  |  RIGHT: contract no
       *  In RTL grid, HTML order: [right-col] [center] [left-col]
       */}
      <div className="pc-hdr">
        {/* RTL-start → physical RIGHT */}
        <div className="pc-hdr-r">
          <span className="pc-dtype">{docTitle}</span>
          <span className="pc-cno">№ {sale.invoice_number}</span>
          {sale.branch?.name && <span className="pc-branch">فرع: {sale.branch.name}</span>}
          <span className="pc-cdate">{fmtDate(sale.sale_date)}</span>
        </div>

        {/* CENTER */}
        <div className="pc-hdr-c">
          <img src="/logo.png" alt="شعار المعرض" className="pc-logo" />
          <p className="pc-name">{SHOWROOM.name}</p>
          <p className="pc-sub">لتجارة السيارات الحديثة</p>
        </div>

        {/* RTL-end → physical LEFT */}
        <div className="pc-hdr-l">
          {SHOWROOM.phones.map(p => <p key={p} className="pc-phone">{p}</p>)}
        </div>
      </div>

      {/* Address strip */}
      <div className="pc-addr">
        {SHOWROOM.address}
        <span className="pc-addr-sep"> — </span>
        <span dir="ltr">{SHOWROOM.addressEn}</span>
      </div>

      {/* ══════════════════════════ PARTIES ═════════════════════════════ */}
      <div className="pc-parties">
        {/* Seller */}
        <div className="pc-party">
          <div className="pc-party-ttl">الطرف الأول (البائع)</div>
          <div className="pc-party-fields">
            <FL label="الاسم"          value={repName} />
            <FL label="السكن"          value={repAddress} />
            <FL label="العنوان"        value={SHOWROOM.address} />
            <FL label="المهنة"         value={repTitle} />
            <FL label="هوية التعريف"  value={repIdNum} />
            <FL label="رقم الموبايل"  value={repPhone} />
          </div>
        </div>
        {/* Buyer */}
        <div className="pc-party">
          <div className="pc-party-ttl pc-party-buyer-ttl">الطرف الثاني (المشتري)</div>
          <div className="pc-party-fields">
            <FL label="الاسم"          value={buyerName} />
            <FL label="السكن"          value={buyerAddress} />
            <FL label="العنوان"        value={buyerAddress} />
            <FL label="المهنة"         value={null} />
            <FL label="هوية التعريف"  value={buyerIdNum} />
            <FL label="رقم الموبايل"  value={buyerPhone} />
          </div>
        </div>
      </div>

      {/* ════════════════════════ AGREEMENT TEXT ════════════════════════ */}
      <div className="pc-ag">
        <p className="pc-ag-title">عقد هذا الاتفاق بين الطرفين كما يلي:</p>
        <p className="pc-ag-body">
          باع الطرف الأول للطرف الثاني السيارة المرقمة وفق البيانات الآتية:
        </p>

        {/* Spec row 1: brand / model / year */}
        <div className="pc-ag-row">
          <SF label="من نوع"    value={c?.brand} />
          <SF label="موديل"     value={c?.model} />
          <SF label="سنة الصنع" value={c?.manufacturing_year} />
        </div>
        {/* Spec row 2: chassis / plate / engine */}
        <div className="pc-ag-row">
          <SF label="رقم الشاصي"  value={c?.vin} />
          <SF label="رقم اللوحة"  value={c?.plate_number} />
          <SF label="رقم المحرك"  value={c?.engine_size} />
        </div>
        {/* Spec row 3: condition / color / fuel */}
        <div className="pc-ag-row">
          <SF label="الحالة"     value={cond} />
          <SF label="اللون"      value={c?.color} />
          <SF label="نوع الوقود" value={fuel} />
        </div>

        {/* Financial lines */}
        <div className="pc-ag-finrows">
          <div className="pc-ag-finrow">
            <span className="pc-ag-finlbl">وقد قبض البائع مبلغاً قدره</span>
            <span className="pc-ag-finsep">:</span>
            <span className="pc-ag-finval">{fmtMoney(sale.paid_amount, sale.currency) ?? '—'}</span>
            <span className="pc-ag-findots" />
          </div>
          <div className="pc-ag-finrow">
            <span className="pc-ag-finlbl">والباقي قدره</span>
            <span className="pc-ag-finsep">:</span>
            <span className="pc-ag-finval">
              {sale.remaining_amount > 0
                ? fmtMoney(sale.remaining_amount, sale.currency)
                : 'مسدد بالكامل'}
            </span>
            <span className="pc-ag-findots" />
          </div>
          <div className="pc-ag-finrow">
            <span className="pc-ag-finlbl">ملاحظات</span>
            <span className="pc-ag-finsep">:</span>
            <span className="pc-ag-findots" />
          </div>
        </div>
      </div>

      {/* ═════════════════════ VEHICLE DATA TABLE ═══════════════════════ */}
      <div className="pc-sec">
        <SH>بيانات المركبة</SH>
        <div className="pc-veh">
          {/* Specs 3-column (right in RTL → physical right) */}
          <div className="pc-veh-specs">
            <div className="pc-veh-col">
              <FL label="الشركة"        value={c?.brand} />
              <FL label="الموديل"       value={c?.model} />
              <FL label="سنة الصنع"    value={c?.manufacturing_year} />
              <FL label="الفئة (تريم)"  value={c?.trim} />
              <FL label="اللون"         value={c?.color} />
              <FL label="الحالة"        value={cond} />
              <FL label="عدد السلندرات" value={c?.cylinders} />
            </div>
            <div className="pc-veh-col">
              <FL label="رقم الشاصي"    value={c?.vin} />
              <FL label="رقم اللوحة"    value={c?.plate_number} />
              <FL label="حالة اللوحة"   value={plateSt} />
              <FL label="رقم المحرك"    value={c?.engine_size} />
              <FL label="نوع الوقود"    value={fuel} />
              <FL label="ناقل الحركة"   value={trans} />
              <FL label="عدد المقاعد"   value={c?.seat_count} />
            </div>
            <div className="pc-veh-col">
              <FL label="المسافة (كم)"    value={c?.mileage != null ? `${Number(c.mileage).toLocaleString('en-US')} كم` : null} />
              <FL label="بلد الاستيراد"  value={c?.import_country} />
              <FL label="مادة المقاعد"   value={c?.seat_material} />
              <FL label="تاريخ الاستيراد" value={fmtDate(c?.created_at)} />
              <FL label="تاريخ التسجيل"   value={fmtDate(sale.sale_date)} />
              <FL label="عدد الكاميرات"  value={null} />
              <FL label="عدد المفاتيح"   value={null} />
            </div>
          </div>
          {/* Photo (left in RTL → physical left) */}
          <div className="pc-veh-photo">
            {photos.length > 0 && (
              <img
                src={photoUrl(photos[0].filename, photos[0].subfolder ?? 'vehicles')}
                alt="صورة المركبة"
                className="pc-car-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const ph = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (ph) ph.style.display = 'flex'
                }}
              />
            )}
            <div className="pc-car-ph" style={photos.length > 0 ? { display: 'none' } : {}}>
              <span>لا توجد صورة</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════ FINANCIAL DETAILS ═══════════════════════════ */}
      <div className="pc-sec">
        <SH>التفاصيل المالية</SH>
        <table className="pc-ftbl">
          <thead>
            <tr>
              <th>سعر البيع</th>
              <th>الخصم</th>
              <th>الإجمالي بعد الخصم</th>
              <th>المبلغ المدفوع</th>
              <th>المبلغ المتبقي</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{fmtMoney(sale.selling_price, sale.currency) ?? '—'}</td>
              <td className={sale.discount > 0 ? 'pc-disc' : ''}>
                {sale.discount > 0 ? fmtMoney(sale.discount, sale.currency) : '—'}
              </td>
              <td className="pc-tot">{fmtMoney(netTotal, sale.currency) ?? '—'}</td>
              <td className="pc-paid">{fmtMoney(sale.paid_amount, sale.currency) ?? '—'}</td>
              <td className={sale.remaining_amount > 0 ? 'pc-rem' : 'pc-paid'}>
                {sale.remaining_amount > 0 ? fmtMoney(sale.remaining_amount, sale.currency) : 'مسدد بالكامل'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="pc-ffoot">
          <span className="pc-ffoot-k">طريقة الدفع :</span>
          <span className="pc-ffoot-v">{tr('pay', sale.payment_method) ?? sale.payment_method}</span>
          <span className="pc-ffoot-sep">|</span>
          <span className="pc-ffoot-k">العملة :</span>
          <span className="pc-ffoot-v">{sale.currency === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي'}</span>
          {sale.installment_plan && <>
            <span className="pc-ffoot-sep">|</span>
            <span className="pc-ffoot-k">الأقساط :</span>
            <span className="pc-ffoot-v">{sale.installment_plan.number_of_months} شهر</span>
          </>}
        </div>
      </div>

      {/* ════════════════════ BUYER DOCUMENTS ═══════════════════════════ */}
      <div className="pc-sec">
        <SH>وثائق المشتري</SH>
        <div className="pc-docs">
          <DocBox doc={getDoc('id_front')}       label="وجه الهوية" />
          <DocBox doc={getDoc('id_back')}        label="ظهر الهوية" />
          <DocBox doc={getDoc('residence_card')} label="بطاقة السكن" />
          <DocBox doc={getDoc('passport')}       label="جواز السفر" />
          {extraDocs.slice(0, 2).map(d => <DocBox key={d.id} doc={d} label="مستمسك آخر" />)}
        </div>
      </div>

      {/* ════════════════════ TERMS ═════════════════════════════════════ */}
      <div className="pc-sec">
        <SH>الشروط والأحكام</SH>
        <ol className="pc-terms">
          <li>أقرّ الطرفان بصحة جميع البيانات والمبالغ الواردة في هذا الاتفاق، ويُعدّ هذا العقد نافذاً بتوقيع الطرفين دون أي تحفظ.</li>
          <li>أسقط المشتري المركبة الموضحة أعلاه بمسؤولياتها الكاملة، وتكون مسؤوليته تجاه السلطات المختصة كاملة من تاريخ الاستلام.</li>
          <li>في حال وجود مبلغ متبقٍ يلتزم المشتري بسداده في الموعد المحدد، وأي تأخير يُترتب عليه المساءلة القانونية.</li>
          <li>لا يحق طلب الاسترداد أو الإلغاء بعد توقيع هذا العقد واستلام المركبة إلا في حال ثبوت عيب مخفي موثّق قانونياً.</li>
          <li>يُعدّ هذا الوصل وثيقةً رسمية معتمدة من {SHOWROOM.nameShort}، وسارية المفعول بتوقيع الطرفين وختم المعرض.</li>
          <li>يحتفظ كلٌّ من الطرفين بنسخة أصلية من هذا العقد للرجوع إليها عند الحاجة.</li>
        </ol>
      </div>

      {/* ════════════════════ SIGNATURES ════════════════════════════════ */}
      <div className="pc-sigs">
        <div className="pc-sig">
          <div className="pc-sig-line" />
          <p className="pc-sig-ttl">ختم المعرض</p>
          <p className="pc-sig-sub">الخاتم الرسمي</p>
        </div>
        <div className="pc-sig">
          <div className="pc-sig-line" />
          <p className="pc-sig-ttl">توقيع المشتري</p>
          <p className="pc-sig-sub">{buyerName ?? '—'}</p>
        </div>
        <div className="pc-sig">
          <div className="pc-sig-line" />
          <p className="pc-sig-ttl">منظم العقد</p>
          <p className="pc-sig-sub">—</p>
        </div>
        <div className="pc-sig">
          <div className="pc-sig-line" />
          <p className="pc-sig-ttl">توقيع البائع</p>
          <p className="pc-sig-sub">{repName}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="pc-foot">
        {SHOWROOM.name} &mdash; جميع الحقوق محفوظة &mdash; تاريخ الإصدار: {fmtDate(new Date().toISOString())}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STYLES
         ══════════════════════════════════════════════════════════════════ */}
      <style jsx global>{`

        /* ── Root ─────────────────────────────────────────────────────── */
        .pc {
          background: #fff;
          color: #111827;
          font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          direction: rtl;
          width: 210mm;
          max-width: 210mm;
          margin: 0 auto;
          border: 1px solid #93a8c0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }

        /* ── Header ───────────────────────────────────────────────────── */
        .pc-hdr {
          background: #1a2f50;
          color: #fff;
          /* RTL grid: col1=right, col2=center, col3=left */
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 3px solid #c9a227;
        }
        /* RIGHT column (RTL start) */
        .pc-hdr-r {
          display: flex; flex-direction: column; gap: 3px;
          align-items: flex-start;
        }
        .pc-dtype {
          font-size: 11px; font-weight: 800; color: #c9a227;
          border: 1px solid #c9a227; padding: 1px 8px; border-radius: 2px;
          letter-spacing: 0.5px;
        }
        .pc-cno   { font-size: 16px; font-weight: 900; color: #fff; letter-spacing: 0.3px; }
        .pc-branch { font-size: 9px; color: #a8c4d8; }
        .pc-cdate  { font-size: 9px; color: #a8c4d8; }

        /* CENTER column */
        .pc-hdr-c { text-align: center; }
        .pc-logo  { height: 60px; width: auto; object-fit: contain; margin: 0 auto 4px; display: block; }
        .pc-name  { font-size: 13px; font-weight: 900; color: #c9a227; margin: 0; line-height: 1.3; }
        .pc-sub   { font-size: 9px; color: #8aaec8; margin: 1px 0 0; }

        /* LEFT column (RTL end) */
        .pc-hdr-l {
          display: flex; flex-direction: column; gap: 3px;
          align-items: flex-end;
        }
        .pc-phone { font-size: 11px; color: #c9d8e8; margin: 0; direction: ltr; }

        /* ── Address strip ────────────────────────────────────────────── */
        .pc-addr {
          background: #e8eef5;
          border-bottom: 1px solid #93a8c0;
          padding: 4px 16px;
          font-size: 9.5px; color: #334155;
          text-align: center;
        }
        .pc-addr-sep { color: #94a3b8; }

        /* ── Parties ──────────────────────────────────────────────────── */
        .pc-parties {
          display: grid; grid-template-columns: 1fr 1fr;
          border-bottom: 2px solid #1a2f50;
        }
        .pc-party { border-left: 1px solid #93a8c0; }
        .pc-party:last-child { border-left: none; }

        .pc-party-ttl {
          background: #1a2f50; color: #fff;
          font-size: 11px; font-weight: 700;
          padding: 4px 12px;
          border-right: 4px solid #c9a227;
        }
        .pc-party-buyer-ttl { background: #163040; }

        .pc-party-fields { padding: 5px 10px; }

        /* ── FormLine (FL) ────────────────────────────────────────────── */
        .fl {
          display: flex; align-items: flex-end; gap: 3px;
          border-bottom: 1px dotted #aabccc;
          padding: 2.5px 0; min-height: 20px;
        }
        .fl:last-child { border-bottom: none; }
        .fl-lbl {
          font-size: 9.5px; font-weight: 700; color: #1e3a5f;
          white-space: nowrap; flex-shrink: 0; min-width: 76px;
        }
        .fl-col { font-size: 9.5px; color: #64748b; flex-shrink: 0; }
        .fl-val { flex: 1; font-size: 10.5px; font-weight: 700; color: #0f172a; padding-right: 3px; }
        .fl-line {
          flex: 1; border-bottom: 1px dotted #94a3b8;
          min-width: 50px; margin-bottom: 2px;
        }

        /* ── Agreement ────────────────────────────────────────────────── */
        .pc-ag {
          background: #f9fafb;
          border-bottom: 2px solid #1a2f50;
          padding: 8px 14px;
        }
        .pc-ag-title {
          font-size: 12px; font-weight: 800; color: #1a2f50;
          text-align: center; margin: 0 0 3px;
        }
        .pc-ag-body {
          font-size: 10.5px; color: #374151;
          text-align: center; margin: 0 0 6px;
        }

        /* Agreement spec rows */
        .pc-ag-row {
          display: flex; gap: 0;
          border: 1px solid #c2cedd;
          border-bottom: none;
        }
        .pc-ag-row:first-of-type { border-radius: 3px 3px 0 0; }
        .pc-ag-row:last-of-type { border-bottom: 1px solid #c2cedd; border-radius: 0 0 3px 3px; }

        /* Inline spec field */
        .sf {
          flex: 1; display: flex; align-items: center; gap: 3px;
          padding: 4px 8px; border-left: 1px solid #c2cedd; overflow: hidden;
        }
        .sf:last-child { border-left: none; }
        .sf-lbl { font-size: 9.5px; font-weight: 700; color: #334155; white-space: nowrap; flex-shrink: 0; }
        .sf-val { font-size: 11px; font-weight: 800; color: #0f172a; padding-right: 3px; flex-shrink: 0; }
        .sf-line {
          flex: 1; border-bottom: 1px dotted #94a3b8;
          min-width: 40px; margin-bottom: 2px;
        }

        /* Financial rows */
        .pc-ag-finrows { margin-top: 7px; }
        .pc-ag-finrow {
          display: flex; align-items: flex-end; gap: 4px;
          border-bottom: 1px dotted #aabccc;
          padding: 3px 0; min-height: 20px;
        }
        .pc-ag-finrow:last-child { border-bottom: none; }
        .pc-ag-finlbl { font-size: 10.5px; font-weight: 700; color: #1a2f50; white-space: nowrap; flex-shrink: 0; }
        .pc-ag-finsep { font-size: 10px; color: #64748b; flex-shrink: 0; }
        .pc-ag-finval { font-size: 12px; font-weight: 900; color: #1a2f50; flex-shrink: 0; padding: 0 4px; }
        .pc-ag-findots {
          flex: 1; border-bottom: 1px dotted #94a3b8;
          min-width: 40px; margin-bottom: 2px;
        }

        /* ── Section header ───────────────────────────────────────────── */
        .pc-sec { border-bottom: 1px solid #93a8c0; }
        .sh {
          background: #1a2f50; color: #fff;
          font-size: 10.5px; font-weight: 700;
          padding: 4px 12px;
          border-right: 4px solid #c9a227;
        }

        /* ── Vehicle ──────────────────────────────────────────────────── */
        .pc-veh {
          display: grid;
          /* specs on RTL start (physical right), photo on RTL end (physical left) */
          grid-template-columns: 1fr 140px;
        }
        .pc-veh-specs {
          display: grid; grid-template-columns: repeat(3, 1fr);
          border-left: 1px solid #93a8c0;
        }
        .pc-veh-col { padding: 5px 8px; border-left: 1px solid #dde8f0; }
        .pc-veh-col:last-child { border-left: none; }
        .pc-veh-col .fl-lbl { min-width: 82px; font-size: 9px; }
        .pc-veh-col .fl-val { font-size: 10px; }

        .pc-veh-photo {
          padding: 8px 6px;
          background: #f5f8fb;
          display: flex; align-items: center; justify-content: center;
        }
        .pc-car-img {
          max-width: 128px; max-height: 96px;
          object-fit: contain; border-radius: 3px;
          border: 1px solid #c2cedd;
        }
        .pc-car-ph {
          width: 128px; height: 96px;
          border: 2px dashed #93a8c0; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          color: #94a3b8; font-size: 9px; text-align: center;
        }

        /* ── Financial table ──────────────────────────────────────────── */
        .pc-ftbl { width: 100%; border-collapse: collapse; }
        .pc-ftbl th {
          background: #e8eef5; color: #1a2f50;
          font-size: 10px; font-weight: 700;
          padding: 5px 8px; border: 1px solid #93a8c0; text-align: center;
        }
        .pc-ftbl td {
          padding: 6px 8px; border: 1px solid #93a8c0;
          text-align: center; font-size: 11.5px; font-weight: 600;
        }
        .pc-disc  { color: #dc2626; }
        .pc-tot   { color: #1a2f50; font-weight: 800; background: #eff6ff; }
        .pc-paid  { color: #16a34a; font-weight: 800; }
        .pc-rem   { color: #dc2626; font-weight: 800; }

        .pc-ffoot {
          display: flex; align-items: center; flex-wrap: wrap; gap: 3px;
          padding: 5px 12px; background: #f5f8fb;
          border-top: 1px solid #c2cedd; font-size: 10.5px;
        }
        .pc-ffoot-k   { color: #475569; }
        .pc-ffoot-v   { color: #1a2f50; font-weight: 700; }
        .pc-ffoot-sep { color: #c2cedd; margin: 0 4px; }

        /* ── Documents ────────────────────────────────────────────────── */
        .pc-docs {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 8px; padding: 8px 12px;
        }
        .dbox { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .dbox-img {
          width: 100%; height: 76px; object-fit: cover;
          border-radius: 3px; border: 1px solid #93a8c0;
        }
        .dbox-ph {
          width: 100%; height: 76px;
          border: 2px dashed #93a8c0; border-radius: 3px;
          display: flex; align-items: center; justify-content: center;
          color: #94a3b8; font-size: 9px;
        }
        .dbox-lbl { font-size: 9.5px; color: #334155; font-weight: 600; text-align: center; }

        /* ── Terms ────────────────────────────────────────────────────── */
        .pc-terms {
          list-style: none; counter-reset: tc;
          padding: 6px 12px; margin: 0;
        }
        .pc-terms li {
          counter-increment: tc;
          display: flex; gap: 5px;
          padding: 2px 0; font-size: 10px; color: #374151; line-height: 1.6;
          border-bottom: 1px dotted #dde8f0;
        }
        .pc-terms li:last-child { border-bottom: none; }
        .pc-terms li::before {
          content: counter(tc, arabic-indic) " -";
          color: #c9a227; font-weight: 800; flex-shrink: 0; min-width: 18px;
        }

        /* ── Signatures ───────────────────────────────────────────────── */
        .pc-sigs {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border-top: 2px solid #1a2f50;
        }
        .pc-sig {
          padding: 14px 8px; text-align: center;
          border-left: 1px solid #93a8c0;
        }
        .pc-sig:last-child { border-left: none; }
        .pc-sig-line { height: 36px; border-bottom: 1.5px solid #1a2f50; margin-bottom: 4px; }
        .pc-sig-ttl  { font-size: 10px; font-weight: 700; color: #1a2f50; margin: 0; }
        .pc-sig-sub  { font-size: 9px; color: #64748b; margin: 2px 0 0; }

        /* ── Footer ───────────────────────────────────────────────────── */
        .pc-foot {
          background: #e8eef5; border-top: 1px solid #93a8c0;
          padding: 4px 14px; font-size: 9px; color: #64748b;
          text-align: center;
        }

        /* ══════════════════ PRINT MEDIA ════════════════════════════════ */
        @media print {
          @page { size: A4 portrait; margin: 0; }

          /* Hide all app chrome */
          aside, header, nav, footer,
          [class*="toolbar"], [class*="Toolbar"],
          [class*="topbar"],  [class*="Topbar"],
          [class*="sidebar"], [class*="Sidebar"],
          [data-radix-scroll-area-viewport],
          .print\\:hidden,
          [class*="receipt-toolbar"],
          [class*="contract-toolbar"] { display: none !important; }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pc {
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 8.5px !important;
            line-height: 1.22 !important;
          }

          .pc-hdr { padding: 5px 10px !important; gap: 5px !important; border-bottom-width: 2px !important; }
          .pc-logo { height: 34px !important; margin-bottom: 1px !important; }
          .pc-name { font-size: 10px !important; line-height: 1.05 !important; }
          .pc-sub,
          .pc-branch,
          .pc-cdate { font-size: 7.5px !important; }
          .pc-dtype { font-size: 8px !important; padding: 0 5px !important; }
          .pc-cno { font-size: 11px !important; }
          .pc-phone { font-size: 8.5px !important; }
          .pc-addr { padding: 2px 10px !important; font-size: 7.8px !important; }

          .pc-party-ttl,
          .sh { padding: 2px 8px !important; font-size: 8.5px !important; border-right-width: 3px !important; }
          .pc-party-fields,
          .pc-veh-col { padding: 2px 6px !important; }
          .fl { min-height: 13px !important; padding: 1px 0 !important; gap: 2px !important; }
          .fl-lbl,
          .fl-col { font-size: 7.6px !important; min-width: 58px !important; }
          .fl-val { font-size: 8px !important; padding-right: 2px !important; }
          .fl-line { margin-bottom: 1px !important; }

          .pc-ag { padding: 4px 9px !important; border-bottom-width: 1px !important; }
          .pc-ag-title { font-size: 9.2px !important; margin-bottom: 1px !important; }
          .pc-ag-body { font-size: 8px !important; margin-bottom: 3px !important; }
          .sf { padding: 2px 5px !important; gap: 2px !important; }
          .sf-lbl { font-size: 7.5px !important; }
          .sf-val { font-size: 8px !important; }
          .pc-ag-finrows { margin-top: 3px !important; }
          .pc-ag-finrow { min-height: 13px !important; padding: 1px 0 !important; }
          .pc-ag-finlbl,
          .pc-ag-finsep { font-size: 7.8px !important; }
          .pc-ag-finval { font-size: 8.8px !important; }

          .pc-veh { grid-template-columns: 1fr 92px !important; }
          .pc-veh-col .fl-lbl { min-width: 61px !important; font-size: 7.2px !important; }
          .pc-veh-col .fl-val { font-size: 7.6px !important; }
          .pc-veh-photo { padding: 4px !important; }
          .pc-car-img,
          .pc-car-ph { width: 84px !important; height: 60px !important; max-width: 84px !important; max-height: 60px !important; }

          .pc-ftbl th { padding: 2px 4px !important; font-size: 7.7px !important; }
          .pc-ftbl td { padding: 3px 4px !important; font-size: 8.3px !important; }
          .pc-ffoot { padding: 2px 8px !important; font-size: 7.8px !important; gap: 2px !important; }
          .pc-docs { gap: 4px !important; padding: 4px 8px !important; }
          .dbox { gap: 1px !important; }
          .dbox-img,
          .dbox-ph { height: 42px !important; border-width: 1px !important; }
          .dbox-lbl { font-size: 7px !important; }
          .pc-terms { padding: 3px 8px !important; }
          .pc-terms li { padding: 0 !important; font-size: 7.4px !important; line-height: 1.28 !important; gap: 3px !important; }
          .pc-terms li::before { min-width: 14px !important; }
          .pc-sig { padding: 5px 6px !important; }
          .pc-sig-line { height: 16px !important; margin-bottom: 2px !important; }
          .pc-sig-ttl { font-size: 7.8px !important; }
          .pc-sig-sub { font-size: 7px !important; margin-top: 1px !important; }
          .pc-foot { padding: 2px 8px !important; font-size: 7px !important; }

          /* Force backgrounds */
          .pc-hdr       { background: #1a2f50 !important; }
          .sh           { background: #1a2f50 !important; }
          .pc-party-ttl { background: #1a2f50 !important; }
          .pc-party-buyer-ttl { background: #163040 !important; }
          .pc-ftbl th   { background: #e8eef5 !important; }
          .pc-tot       { background: #eff6ff !important; }
          .pc-addr      { background: #e8eef5 !important; }
          .pc-ag        { background: #f9fafb !important; }
          .pc-ffoot     { background: #f5f8fb !important; }
          .pc-veh-photo { background: #f5f8fb !important; }
          .pc-foot      { background: #e8eef5 !important; }

          /* Prevent breaks inside critical blocks */
          .pc-parties   { page-break-inside: avoid; }
          .pc-ag        { page-break-inside: avoid; }
          .pc-sigs      { page-break-inside: avoid; }
          .pc-sec       { page-break-inside: avoid; }

          /* Receipt/contract shell wrapper */
          [class*="receipt-shell"],
          [class*="contract-shell"] {
            background: white !important;
            padding: 0 !important;
            min-height: unset !important;
          }
        }
      `}</style>
    </div>
  )
}
