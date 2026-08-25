'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api/client'
import { SHOWROOM } from '@/lib/showroom-config'
import { CheckCircle2, ShieldCheck, FileCheck, Car, Calendar, CreditCard, Building2, User, Phone, MapPin, AlertTriangle, XCircle, Loader2 } from 'lucide-react'

export default function PublicDocumentVerificationPage() {
  const params = useParams()
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id

  // Fetch document verification status from public backend endpoint (No auth required)
  const { data: verification, isLoading, isError } = useQuery({
    queryKey: ['public-sale-verify', rawId],
    queryFn: async () => {
      if (!rawId) return null
      try {
        const res = await get<any>(`/Contracts/verify/${rawId}`, { skipAuthRedirect: true } as any)
        return res?.data ?? res
      } catch {
        return null
      }
    },
    enabled: Boolean(rawId),
    staleTime: 5 * 60 * 1000,
  })

  const verificationCode = String(rawId || '').toUpperCase()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4" dir="rtl">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-300 font-semibold text-sm">جاري الفحص والتحقق من سجلات الوثيقة...</p>
      </div>
    )
  }

  const notFound = isError || !verification

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans py-8 px-4 flex flex-col items-center justify-center" dir="rtl">
      
      {/* Main Card Container */}
      <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* Top Header Banner */}
        <div className={`p-6 text-center relative overflow-hidden ${
          notFound ? 'bg-gradient-to-r from-rose-900 via-rose-800 to-[#1e1b2e]' :
          verification.status === 'CANCELLED' || verification.status === 'SUPERSEDED' ? 'bg-gradient-to-r from-amber-900 via-amber-800 to-[#221c17]' :
          'bg-gradient-to-r from-emerald-800 via-teal-900 to-[#0F223D]'
        }`}>
          <div className="absolute top-0 right-0 left-0 bottom-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
          
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 mb-3 shadow-inner ${
            notFound ? 'bg-rose-500/20 border-rose-400 text-rose-300' :
            verification.status === 'CANCELLED' || verification.status === 'SUPERSEDED' ? 'bg-amber-500/20 border-amber-400 text-amber-300' :
            'bg-emerald-500/20 border-emerald-400 text-emerald-300'
          }`}>
            {notFound ? <XCircle className="w-10 h-10" /> :
             verification.status === 'CANCELLED' || verification.status === 'SUPERSEDED' ? <AlertTriangle className="w-10 h-10" /> :
             <ShieldCheck className="w-10 h-10" />}
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">نظام التحقق الرسمي من الوثائق والعقود</h1>
          <p className="text-slate-300 text-xs font-semibold mt-1">شركة الأصدقاء لتجارة السيارات — قاعدة البيانات المركزية</p>

          {!notFound && verification.isValid && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>وثيقة سارية ومعتمدة 100% في سجلات المعرض</span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">

          {notFound ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-rose-400 font-bold text-base">لم يتم العثور على وثيقة مطابقة بهذا الرمز</p>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                رمز التحقق <span className="font-mono text-amber-300 font-bold">{verificationCode}</span> غير مسجل أو قد يكون ادخل بشكل خاطئ. يرجى التأكد من مسح الـ QR الأصلي الموجود على الوثيقة المطبوعة.
              </p>
            </div>
          ) : (
            <>
              {/* Message Banner for Invalid / Superseded / Cancelled */}
              {(!verification.isValid || verification.status === 'CANCELLED' || verification.status === 'SUPERSEDED') && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs text-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-sm text-amber-300">
                    <AlertTriangle className="w-4 h-4" /> تراجع: تنبيه بشأن هذه الوثيقة
                  </p>
                  <p className="leading-relaxed">{verification.message || 'هذه الوثيقة غير معتمدة رسمياً.'}</p>
                  {verification.replacementDocumentNumber && (
                    <p className="font-mono text-cyan-300 font-bold pt-1">الوثيقة البديلة الحديثة: {verification.replacementDocumentNumber}</p>
                  )}
                </div>
              )}

              {/* Document Key Metadata */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">رمز التحقق الفردي:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{verificationCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">رقم الفاتورة / العقد:</span>
                  <span className="font-mono font-bold text-white text-sm">{verification.documentNumber || verification.contractNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">تاريخ تحرير العقد:</span>
                  <span className="font-bold text-slate-200">{verification.saleDate || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">إصدار الوثيقة (Revision):</span>
                  <span className="font-mono font-bold text-cyan-300">النسخة #{verification.revision || 1}</span>
                </div>
              </div>

              {/* Vehicle & Buyer Summary */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <span>تفاصيل الوثيقة والتعاقد</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 block">تفاصيل المركبة:</span>
                    <p className="font-bold text-slate-100 text-sm mt-0.5">{verification.vehicleSummary || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block">المشتري (الطرف الثاني):</span>
                    <p className="font-bold text-slate-100 text-sm mt-0.5">{verification.buyerNameMasked || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Showroom Contact Box */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-2 text-xs">
                <h3 className="font-bold text-[#b89a25] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> الجهة المحررة للوثيقة:
                </h3>
                <p className="font-bold text-slate-100">{SHOWROOM.name}</p>
                <p className="text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {SHOWROOM.address}</p>
                <p className="text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {SHOWROOM.phones[0]}</p>
              </div>

              {/* Security Footer Note */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center text-emerald-200 text-xs font-semibold leading-relaxed">
                🛡️ هذا السجل موثق رسمياً ومحفوظ إلكترونياً في السحابة المركزية لشركة الأصدقاء لتجارة السيارات.
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-900 border-t border-slate-700/80 p-4 text-center text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} شركة الأصدقاء لتجارة السيارات — جميع الحقوق محفوظة
        </div>

      </div>

    </div>
  )
}
