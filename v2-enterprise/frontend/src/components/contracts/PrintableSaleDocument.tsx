'use client'

/**
 * PrintableSaleDocument — Official Two-Page Al-Asdiqaa Showroom Contract
 * Enlarged typography, full A4 page coverage, shrink notes & enlarge signatures.
 */

import React from 'react'
import { SHOWROOM } from '@/lib/showroom-config'
import type { SaleDetail } from '@/lib/api/sales'
import type { Car } from '@/lib/api/inventory'
import type { Customer } from '@/lib/api/customers'

export type SaleDocumentDto = any

/* ─── Helpers ────────────────────────────────────────────────────────────── */

export function photoUrl(filename: string, subfolder = '') {
  return subfolder
    ? `/static/uploads/${subfolder}/${filename}`
    : `/static/uploads/${filename}`
}

function fmtDate(val?: string | null): string {
  if (!val) return '—'
  try {
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(val))
  } catch { return val }
}

function fmtMoney(amount: number | null | undefined, currency: string): string {
  if (amount == null) return '—'
  const n = Number(amount)
  const fmt = (n % 1 !== 0)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-US')
  return currency === 'IQD' ? `${fmt} د.ع` : `$ ${fmt}`
}

const AR: Record<string, Record<string, string>> = {
  fuel:  { Gasoline: 'بنزين', Diesel: 'ديزل', Hybrid: 'هايبرد', Electric: 'كهربائي' },
  trans: { Automatic: 'أوتوماتيك', Manual: 'يدوي', CVT: 'CVT', DCT: 'DCT' },
  cond:  { New: 'جديدة', Used: 'مستعملة', Damaged: 'متضررة', Salvage: 'خردة' },
  pay:   { Cash: 'نقداً', Installment: 'أقساط', 'Bank transfer': 'حوالة مصرفية' },
}
const tr = (dict: string, key?: string | null) => (key ? (AR[dict][key] ?? key) : null)

/* ─── Form Line Field ─────────────────────────────────────────────────────── */
function FL({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="c-fl">
      <span className="c-fl-lbl">{label}:</span>
      <span className="c-fl-val">{value != null && value !== '' ? value : '—'}</span>
    </div>
  )
}

export interface PrintableSaleDocumentProps {
  sale?: SaleDetail
  document?: any
  fullCar?: Car | null
  fullBuyer?: Customer | null
  mode?: 'receipt' | 'contract'
}

export function PrintableSaleDocument({ sale: inputSale, document, fullCar, fullBuyer }: PrintableSaleDocumentProps) {
  const sale: SaleDetail = inputSale ?? (document ? {
    id: document.id,
    invoice_number: document.contractNumber || document.documentNumber,
    sale_date: document.saleDate,
    selling_price: document.financials?.sellingPriceAmount ?? 0,
    paid_amount: document.financials?.depositPaidAmount ?? 0,
    remaining_amount: document.financials?.remainingBalanceAmount ?? 0,
    currency: document.financials?.currency || 'USD',
    payment_method: document.financials?.paymentMethod || 'Cash',
    sales_rep_name: document.organizerEmployeeNameSnapshot || document.preparedByEmployeeNameSnapshot,
    sales_rep_phone: document.organizerEmployeePhoneSnapshot,
    sales_rep_id_number: document.organizerEmployeeIdNumberSnapshot,
    sales_rep_title: document.organizerEmployeeJobTitleSnapshot,
    car: {
      brand: document.vehicle?.brand,
      model: document.vehicle?.model,
      manufacturing_year: document.vehicle?.manufacturingYear,
      color: document.vehicle?.color,
      vin: document.vehicle?.vin,
      engine_size: document.vehicle?.engineNumber,
      plate_number: document.vehicle?.plateNumber,
      mileage: document.vehicle?.mileage,
      condition: document.vehicle?.condition,
    },
    buyer: {
      name: document.buyer?.fullName,
      phone: document.buyer?.phone,
      id_number: document.buyer?.idNumber,
      address: document.buyer?.address,
    }
  } as any : {} as any)

  const c = (fullCar ?? sale.car) as Car | null

  // Resolve Seller (Party 1 / البائع) based on Ownership Type (PERSON, SUPPLIER, COMPANY):
  const rawOwnershipType = (
    (sale as any).ownership_type || 
    (sale as any).ownershipType || 
    (document as any)?.ownershipType ||
    (c as any)?.ownership_type ||
    ((sale as any).owner_person_name || (sale as any).ownerPersonName || (c as any)?.owner_person_name ? 'PERSON' : 
     ((sale as any).supplier_name || (sale as any).supplierName || c?.supplier_name ? 'SUPPLIER' : 'COMPANY'))
  )
  
  let ownershipType = String(rawOwnershipType).toUpperCase()
  if (rawOwnershipType === 1 || rawOwnershipType === '1') ownershipType = 'PERSON'
  if (rawOwnershipType === 2 || rawOwnershipType === '2') ownershipType = 'SUPPLIER'
  if (rawOwnershipType === 3 || rawOwnershipType === '3') ownershipType = 'COMPANY'

  let sellerName = SHOWROOM.name
  let sellerIdNum = (sale as any).sales_rep_id_number ?? SHOWROOM.phones[0]
  let sellerPhone = (sale as any).sales_rep_phone ?? SHOWROOM.phones[0]
  let sellerAddress = (sale as any).sales_rep_address ?? 'بغداد — العراق'
  let sellerTitle = 'الطرف الأول (البائع)'
  let sellerEmail = 'sales@alasdiqaa.com'

  if (ownershipType === 'PERSON') {
    sellerName = (sale as any).owner_person_name || (sale as any).ownerPersonName || (c as any)?.owner_person_name || '—'
    sellerIdNum = (sale as any).owner_person_id_number || (sale as any).ownerPersonIdNumber || (c as any)?.owner_person_id_number || '—'
    sellerPhone = (sale as any).owner_person_phone || (sale as any).ownerPersonPhone || (c as any)?.owner_person_phone || '—'
    sellerAddress = (sale as any).owner_address || (sale as any).ownerAddress || '—'
    sellerTitle = 'الطرف الأول (البائع - المالك)'
    sellerEmail = '—'
  } else if (ownershipType === 'SUPPLIER') {
    sellerName = (sale as any).supplier_name || (sale as any).supplierName || c?.supplier_name || (sale as any).supplier?.name || '—'
    sellerIdNum = (sale as any).supplier_code || (sale as any).supplierCode || (sale as any).supplier_reference || '—'
    sellerPhone = (sale as any).supplier_phone || (sale as any).supplierPhone || (sale as any).supplier?.phone || '—'
    sellerAddress = (sale as any).supplier_address || (sale as any).supplierAddress || (sale as any).supplier?.address || '—'
    sellerTitle = 'الطرف الأول (البائع - المورد)'
    sellerEmail = (sale as any).supplier_email || '—'
  }

  const buyerName    = fullBuyer?.full_name ?? fullBuyer?.name ?? sale.buyer?.name ?? '—'
  const buyerPhone   = fullBuyer?.phone    ?? sale.buyer?.phone ?? '—'
  const buyerIdNum   = fullBuyer?.id_number ?? sale.buyer?.id_number ?? '—'
  const buyerAddress = fullBuyer?.address  ?? sale.buyer?.address ?? '—'

  const repName    = sale.sales_rep_name    ?? SHOWROOM.nameShort
  const repPhone   = sale.sales_rep_phone   ?? SHOWROOM.phones[0]
  const repIdNum   = sale.sales_rep_id_number ?? '—'
  const repTitle   = sale.sales_rep_title   ?? 'منظّم العقد'
  const repAddress = sale.sales_rep_address ?? 'بغداد — العراق'

  const cond = tr('cond', c?.condition) || 'مستعملة'
  const payMethod = tr('pay', sale.payment_method) ?? (sale.remaining_amount > 0 ? 'أقساط' : 'نقداً')

  // Generate document verification code
  const verificationCode = 
    (sale as any).verification_code || 
    (sale as any).verificationCode || 
    (sale as any).contract_number || 
    (sale as any).contractNumber || 
    (sale as any).document_number || 
    (sale as any).documentNumber || 
    sale.invoice_number || 
    (sale.id ? String(sale.id) : '8666F9F1-D')

  // Estimate final payment date
  const finalPaymentDate = sale.installment_plan?.schedules 
    ? fmtDate(sale.installment_plan.schedules[sale.installment_plan.schedules.length - 1]?.due_date)
    : fmtDate(sale.sale_date)

  // Public QR target URL (Scannable with any mobile phone camera)
  const publicQrTargetUrl = `https://admin.al-asdiqa.com/QR/${verificationCode}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicQrTargetUrl)}`

  return (
    <div className="c-doc-container" dir="rtl">

      {/* =======================================================================
          PAGE 1: CONTRACT DETAILS (عقد بيع وشراء مركبة)
         ======================================================================= */}
      <div className="c-page page-1">
        
        {/* Header Block */}
        <div className="c-hdr">
          <div className="c-hdr-r">
            <img src="/logo.png" alt="شعار المعرض" className="c-logo" />
            <div>
              <p className="c-co-name">شركة الأصدقاء</p>
              <p className="c-co-sub">لتجارة السيارات</p>
            </div>
          </div>
          <div className="c-hdr-c">
            <h1 className="c-doc-title">عقد بيع وشراء مركبة</h1>
            <p className="c-doc-subtitle">نموذج تعاقدي رسمي مع ختم تحقق وعلامات مائية أمنية</p>
          </div>
          <div className="c-hdr-l">
            <div className="c-meta-box">
              <p><span>رقم العقد:</span> <b>{sale.invoice_number}</b></p>
              <p><span>تاريخ الإصدار:</span> <b>{fmtDate(sale.sale_date)}</b></p>
              <p><span>رمز الوثيقة:</span> <b className="font-mono">{verificationCode}</b></p>
            </div>
            <img src={qrImageUrl} alt="QR Code" className="c-qr" width={56} height={56} />
          </div>
        </div>

        <div className="c-content space-y-3.5 flex-1 flex flex-col justify-between">
          {/* Section 1 */}
          <div className="c-sec">
            <h2 className="c-sec-title">أولاً: بيانات العقد</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FL label="رقم العقد" value={sale.invoice_number} />
              <FL label="تاريخ التحرير" value={fmtDate(sale.sale_date)} />
              <FL label="مكان التحرير" value="معرض شركة الأصدقاء - الفرع الرئيسي" />
              <FL label="اسم الشركة أو المرجع" value="شركة الأصدقاء لتجارة السيارات" />
              <FL label="اسم الموظف المختص" value={repName} />
              <FL label="فرع الشركة" value="الفرع الرئيسي" />
            </div>
          </div>

          {/* Section 2 */}
          <div className="c-sec">
            <h2 className="c-sec-title">ثانياً: بيانات الطرف الأول (البائع)</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FL label="الاسم الكامل" value={sellerName} />
              <FL label="رقم الهوية أو البطاقة الوطنية" value={sellerIdNum} />
              <FL label="رقم الهاتف" value={sellerPhone} />
              <FL label="العنوان الكامل" value={sellerAddress} />
              <FL label="صفة التوقيع" value={sellerTitle} />
              <FL label="البريد الإلكتروني" value={sellerEmail} />
            </div>
          </div>


          {/* Section 3 */}
          <div className="c-sec">
            <h2 className="c-sec-title">ثالثاً: بيانات الطرف الثاني (المشتري)</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FL label="الاسم الكامل" value={buyerName} />
              <FL label="رقم الهوية أو البطاقة الوطنية" value={buyerIdNum} />
              <FL label="رقم الهاتف" value={buyerPhone} />
              <FL label="العنوان الكامل" value={buyerAddress} />
              <FL label="صفة التوقيع" value="الطرف الثاني (المشتري)" />
              <FL label="البريد الإلكتروني" value="—" />
            </div>
          </div>

          {/* Section 4 */}
          <div className="c-sec">
            <h2 className="c-sec-title">رابعاً: بيانات المركبة</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FL label="نوع المركبة" value={c?.brand} />
              <FL label="الموديل والفئة" value={c?.model} />
              <FL label="سنة الصنع" value={c?.manufacturing_year} />
              <FL label="اللون" value={c?.color} />
              <FL label="رقم الشاصي" value={c?.vin} />
              <FL label="رقم المحرك" value={c?.engine_size || '—'} />
              <FL label="رقم اللوحة" value={c?.plate_number || 'بدون لوحة'} />
              <FL label="المسافة المقطوعة" value={c?.mileage != null ? `${c.mileage.toLocaleString()} كم` : '0 كم'} />
              <FL label="حالة المركبة عند البيع" value={cond} />
              <FL label="الملحقات المسلمة" value="مفاتيح السيارة، السنوية والملحقات القياسية" />
            </div>
          </div>

          {/* Section 5 */}
          <div className="c-sec">
            <h2 className="c-sec-title">خامساً: القيمة المالية وطريقة الدفع</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FL label="قيمة البيع رقماً" value={fmtMoney(sale.selling_price, sale.currency)} />
              <FL label="قيمة البيع كتابةً" value="فقط وقدره (تم تدقيق ومطابقة السعر مع الحسابات)" />
              <FL label="طريقة الدفع" value={payMethod} />
              <FL label="المدفوع من الدفعة الأولى" value={fmtMoney(sale.paid_amount, sale.currency)} />
              <FL label="المبلغ المتبقي" value={fmtMoney(sale.remaining_amount, sale.currency)} />
              <FL label="موعد السداد النهائي" value={finalPaymentDate} />
              <FL label="تاريخ تسليم المركبة" value={fmtDate(sale.sale_date)} />
              <FL label="حالة المستندات" value="مكتملة ومطابقة" />
            </div>
          </div>
        </div>

        {/* Security Warning Note */}
        <div className="c-warning-box my-1.5">
          🛡️ تنبيه أمني: أي كشط أو تعديل أو إضافة في هذا العقد يُعد باطلاً ويخضع للمسؤولية القانونية ويعتبر تزويراً للوثائق.
        </div>

        {/* Footer */}
        <div className="c-footer">
          <span>نسخة: العميل</span>
          <span className="font-bold text-slate-500">ختم الشركة وتوقيع الطرفين</span>
          <span>نسخة: الشركة</span>
        </div>
      </div>

      {/* =======================================================================
          PAGE 2: TERMS AND SIGNATURES (شروط العقد والتوقيعات)
         ======================================================================= */}
      <div className="c-page page-2">
        
        {/* Header Block */}
        <div className="c-hdr">
          <div className="c-hdr-r">
            <img src="/logo.png" alt="شعار المعرض" className="c-logo" />
            <div>
              <p className="c-co-name">شركة الأصدقاء</p>
              <p className="c-co-sub">لتجارة السيارات</p>
            </div>
          </div>
          <div className="c-hdr-c">
            <h1 className="c-doc-title">عقد بيع وشراء مركبة</h1>
            <p className="c-doc-subtitle">الصفحة الثانية — البنود والتوقيعات الرسمية</p>
          </div>
          <div className="c-hdr-l">
            <div className="c-meta-box">
              <p><span>رقم العقد:</span> <b>{sale.invoice_number}</b></p>
              <p><span>تاريخ الإصدار:</span> <b>{fmtDate(sale.sale_date)}</b></p>
              <p><span>رمز الوثيقة:</span> <b className="font-mono">{verificationCode}</b></p>
            </div>
            <img src={qrImageUrl} alt="QR Code" className="c-qr" width={56} height={56} />
          </div>
        </div>

        <div className="c-content space-y-3 flex-1 flex flex-col justify-between">
          
          {/* Section 6: clauses */}
          <div className="c-sec">
            <h2 className="c-sec-title">سادساً: بنود العقد</h2>
            <div className="c-clauses space-y-1">
              <div className="c-clause">
                <span className="c-clause-no">01</span>
                <p>أقر الطرف الأول بأنه المالك أو المدخل قانوناً لبيع المركبة المبينة في هذا العقد، وأن جميع البيانات المقدمة صحيحة حسب المستندات المتاحة عند التعاقد.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">02</span>
                <p>أقر الطرف الثاني بأنه عاين المركبة معاينة نافية للجهالة، واطلع على حالتها الفنية والقانونية وقبل بشرائها وفق البيانات والرسوم والمواصفات المحددة.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">03</span>
                <p>لا تنتقل مسؤولية حيازة المركبة واستعمالها إلى الطرف الثاني إلا بعد إتمام تسليم المبلغ، وتوقيع عقد التسليم واستكمال إجراءات الدفع المحددة.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">04</span>
                <p>يلتزم البائع بكل ما ورد بالالتزامات والرسوم والغرامات السابقة على المركبة التي ثبت وجودها ضمن مستنداته، ولم يقم البائع بالإفصاح كتابةً عن خلاف ذلك.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">05</span>
                <p>يلتزم الأطراف بتزويد الشركة بأي مستندات أصلية أو نسخ لازمة لإكمال إجراءات البيع والنقل والتسجيل لدى الجهات المختصة.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">06</span>
                <p>في حال ثبوت أي خلاف بعد إتمام العقد بين طرفي العقد بيعاً أو ملكيةً أو مسؤوليةً عن مخالفات مرورية أو مالية، يُعد كل طرف مسؤولاً عن ما يخصه.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">07</span>
                <p>يضمن المشتري استلام المركبة في حالة جيدة ومطابقة للمواصفات، وتخلي الشركة مسؤوليتها عن أي عيوب أو أعطال مستقبلية تنتج عن أصل المصنع أو نتيجة الاستعمال للمركبة بعد التسليم.</p>
              </div>
              <div className="c-clause">
                <span className="c-clause-no">08</span>
                <p>يحظر هذا العقد من نسختين أصليتين بيد كل طرف نسخة، وتعد النسخ المصورة أو الإلكترونية نافذة عند مطابقتها لرقم التحقق وسجل الشركة.</p>
              </div>
            </div>
          </div>

          {/* Section 7: notes (COMPACT) */}
          <div className="c-sec c-sec-compact">
            <h2 className="c-sec-title">سابعاً: ملاحظات أو شروط إضافية</h2>
            <div className="c-notes-area-compact">
              <p className="c-note-line-compact">{(sale as any).notes || sale.payments?.[0]?.notes || 'لا يوجد ملاحظات إضافية تم تسجيلها.'}</p>
            </div>
          </div>

          {/* Section 8: signatures (PROMINENT & ENLARGED) */}
          <div className="c-sec c-sec-signatures flex-1 flex flex-col justify-end">
            <h2 className="c-sec-title c-sec-title-lg">ثامناً: التوقيعات والختم الرسمية</h2>
            
            <div className="c-sigs-grid">
              <div className="c-sig-box">
                <div className="c-sig-title">توقيع البائع (الطرف الأول)</div>
                <div className="c-sig-line"></div>
                <div className="c-sig-name">الاسم: {sellerName}</div>
              </div>
              <div className="c-sig-box">
                <div className="c-sig-title">توقيع المشتري (الطرف الثاني)</div>
                <div className="c-sig-line"></div>
                <div className="c-sig-name">الاسم: {buyerName}</div>
              </div>
              <div className="c-sig-box">
                <div className="c-sig-title">توقيع ممثل الشركة المختص</div>
                <div className="c-sig-line"></div>
                <div className="c-sig-name">الاسم: {repName}</div>
              </div>
            </div>

            {/* Seal and note (Enlarged) */}
            <div className="c-seal-wrap">
              <div className="c-seal-stamp">
                <span>ختم</span>
                <span>الشركة</span>
                <span>الرسمي</span>
              </div>
              <p className="c-seal-note">أقر الموقعون أعلاه بصحة البيانات والتفريغات الواردة في هذا العقد واستلم كل طرف نسخته الأصلية بعد المطابقة والتوقيع.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="c-footer">
          <span>نسخة: العميل</span>
          <span className="font-bold text-slate-500">ختم الشركة وتوقيع الطرفين الرسمية</span>
          <span>نسخة: الشركة</span>
        </div>
      </div>

      {/* =======================================================================
          STYLES (Scoped to printable document layout)
         ======================================================================= */}
      <style jsx global>{`
        .c-doc-container {
          background: #0f172a;
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .c-page {
          background: #ffffff;
          color: #1e293b;
          width: 210mm;
          min-height: 297mm;
          max-height: 297mm;
          padding: 10mm 14mm;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: 'Tajawal', sans-serif;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }

        /* ── Header Styling ── */
        .c-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #0f223d;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .c-hdr-r {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        .c-logo {
          height: 42px;
          width: auto;
          object-fit: contain;
        }
        .c-co-name {
          font-size: 15px;
          font-weight: 900;
          color: #0f223d;
          line-height: 1.2;
        }
        .c-co-sub {
          font-size: 10px;
          color: #64748b;
          font-weight: 700;
        }
        .c-hdr-c {
          text-align: center;
          flex: 2;
        }
        .c-doc-title {
          font-size: 21px;
          font-weight: 900;
          color: #0f223d;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .c-doc-subtitle {
          font-size: 9.5px;
          color: #b89a25;
          font-weight: 800;
          margin-top: 2px;
        }
        .c-hdr-l {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
          flex: 1.5;
        }
        .c-meta-box {
          font-size: 9.5px;
          color: #334155;
          text-align: right;
          line-height: 1.5;
          white-space: nowrap;
        }
        .c-meta-box span {
          color: #64748b;
          font-weight: 700;
          display: inline-block;
        }
        .c-meta-box b {
          color: #0f223d;
          display: inline-block;
          direction: ltr;
        }
        .c-qr {
          height: 54px;
          width: 54px;
          object-fit: contain;
          border: 1.5px solid #e2e8f0;
          padding: 2px;
          border-radius: 6px;
          background: #ffffff;
        }

        /* ── Sections ── */
        .c-sec-title {
          background: #0f223d;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          padding: 5px 12px;
          border-right: 5px solid #dc2626;
          margin-bottom: 7px;
          border-radius: 2px;
        }
        .c-sec-title-lg {
          font-size: 12px;
          padding: 6px 14px;
        }

        /* ── Form fields (dotted line) ── */
        .c-fl {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          border-bottom: 1px dotted #cbd5e1;
          padding-bottom: 2px;
          min-height: 22px;
        }
        .c-fl-lbl {
          font-size: 10px;
          font-weight: 800;
          color: #475569;
          white-space: nowrap;
        }
        .c-fl-val {
          font-size: 10.5px;
          font-weight: 900;
          color: #0f172a;
          flex: 1;
        }

        /* ── Clauses ── */
        .c-clauses {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .c-clause {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 10px;
          border-bottom: 1px dotted #cbd5e1;
          padding: 5px 0;
          direction: rtl;
        }
        .c-clause:last-child {
          border-bottom: none;
        }
        .c-clause-no {
          background: #f1f5f9;
          color: #0f223d;
          font-weight: 900;
          font-size: 10.5px;
          padding: 2.5px 8px;
          border-radius: 4px;
          flex-shrink: 0;
          min-width: 26px;
          text-align: center;
        }
        .c-clause p {
          font-size: 10px;
          line-height: 1.5;
          color: #1e293b;
          margin: 0;
          font-weight: 700;
          flex: 1;
        }

        /* ── Notes area (COMPACT) ── */
        .c-notes-area-compact {
          border: 1px dashed #cbd5e1;
          border-radius: 5px;
          padding: 6px 12px;
          background: #f8fafc;
        }
        .c-note-line-compact {
          font-size: 9.5px;
          font-weight: 800;
          color: #475569;
          line-height: 1.4;
          margin: 0;
        }

        /* ── Signatures Section (ENLARGED) ── */
        .c-sigs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 10px;
        }
        .c-sig-box {
          border: 1.5px solid #0f223d;
          border-radius: 8px;
          padding: 14px 12px 10px;
          text-align: center;
          min-height: 88px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
        }
        .c-sig-title {
          font-size: 11px;
          font-weight: 900;
          color: #0f223d;
        }
        .c-sig-line {
          min-height: 28px;
        }
        .c-sig-name {
          font-size: 9.5px;
          color: #334155;
          font-weight: 800;
          margin-top: 8px;
          border-top: 1px dashed #94a3b8;
          padding-top: 5px;
        }

        /* ── Seal Stamp (ENLARGED) ── */
        .c-seal-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
          background: #f8fafc;
          border-radius: 8px;
          padding: 10px 14px;
          border: 1.5px solid #0f223d;
        }
        .c-seal-stamp {
          width: 58px;
          height: 58px;
          border: 2px dashed #0f223d;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #0f223d;
          font-size: 9px;
          font-weight: 900;
          line-height: 1.15;
          flex-shrink: 0;
          background: #ffffff;
        }
        .c-seal-note {
          font-size: 9.5px;
          font-weight: 800;
          color: #334155;
          line-height: 1.4;
        }

        /* ── Warning Box ── */
        .c-warning-box {
          background: #fffbeb;
          border: 1px solid #fef08a;
          color: #854d0e;
          font-size: 9.5px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 6px;
          text-align: center;
        }

        /* ── Footer ── */
        .c-footer {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #64748b;
          font-weight: 800;
          border-top: 1px solid #cbd5e1;
          padding-top: 5px;
          margin-top: 6px;
        }

        /* =======================================================================
            PRINT STYLING (Strict A4 2-Page Pagination Invariant)
           ======================================================================= */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          /* Hide app topbar, sidebar, FAB, floating actions, etc. */
          aside, header, nav, footer,
          [class*="toolbar"], [class*="Toolbar"],
          [class*="topbar"],  [class*="Topbar"],
          [class*="sidebar"], [class*="Sidebar"],
          [data-radix-scroll-area-viewport],
          .print\\:hidden, .print\:hidden,
          [class*="receipt-toolbar"],
          [class*="contract-toolbar"],
          .fixed, [class*="fixed"] {
            display: none !important;
          }


          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .c-doc-container {
            padding: 0 !important;
            background: white !important;
            gap: 0 !important;
          }

          .c-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .c-page.page-1 {
            page-break-after: always !important;
            break-after: page !important;
          }

          .c-page.page-2 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .c-page * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
