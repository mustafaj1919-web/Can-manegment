'use client';

import React, { useState } from 'react';
import { useShowroomStore } from '@/store/useStore';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ContactForm() {
  const lang = useShowroomStore((state) => state.lang);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const content = {
    ar: {
      heading: 'تواصل معنا الآن',
      desc: 'اترك معلوماتك وسيقوم أحد مستشاري صالة العرض بالتواصل معك خلال دقائق لتنسيق طلبك.',
      nameLabel: 'الاسم الكامل',
      namePlaceholder: 'اسمك الثنائي أو الثلاثي',
      phoneLabel: 'رقم الهاتف',
      phonePlaceholder: '07xxxxxxxxx',
      msgLabel: 'تفاصيل الاستفسار (اختياري)',
      msgPlaceholder: 'اذكر السيارة التي تهمك أو نوع القسط المطلوب...',
      submitBtn: 'إرسال الطلب وحجز موعد',
      submitting: 'جاري الإرسال...',
      successTitle: 'تم استلام طلبك بنجاح!',
      successDesc: 'شكراً لثقتك بنا. سيقوم فريق مبيعات الأصدقاء بالاتصال بك قريباً جداً.',
      errorTitle: 'فشل إرسال الطلب',
      errorDesc: 'حدث خطأ غير متوقع. يرجى التحقق من الشبكة والمحاولة مرة أخرى.',
      phoneWarning: 'يرجى كتابة رقم هاتف عراقي صحيح يتكون من 11 رقماً (مثال: 07700000000)'
    },
    en: {
      heading: 'Get In Touch',
      desc: 'Leave your details and one of our showroom advisors will call you shortly to assist you.',
      nameLabel: 'Full Name',
      namePlaceholder: 'Your first and last name',
      phoneLabel: 'Phone Number',
      phonePlaceholder: '07xxxxxxxxx',
      msgLabel: 'Message Details (Optional)',
      msgPlaceholder: 'Mention models you are interested in or financing queries...',
      submitBtn: 'Submit Request & Book Appointment',
      submitting: 'Sending...',
      successTitle: 'Request Received!',
      successDesc: 'Thank you. Al-Sadaka team will contact you shortly.',
      errorTitle: 'Submission Failed',
      errorDesc: 'An unexpected error occurred. Please check your connection and try again.',
      phoneWarning: 'Please enter a valid 11-digit Iraqi phone number (e.g., 07700000000)'
    }
  };

  const t = content[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    // Basic Iraqi phone validation: starts with 07 and total 11 digits
    const cleanedPhone = phone.trim().replace(/[\s-]/g, '');
    const iraqiPhoneRegex = /^07[3-9]\d{8}$/;
    if (!iraqiPhoneRegex.test(cleanedPhone)) {
      setStatus('error');
      setErrorText(t.phoneWarning);
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanedPhone,
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        
        // Fire gold confetti celebrating the success!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#d4af37', '#ffffff', '#e2e8f0']
        });
        
        // Reset form
        setName('');
        setPhone('');
        setMessage('');
      } else {
        throw new Error(data.error || 'Submission rejected');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorText(t.errorDesc);
    }
  };

  return (
    <section id="contact" className="py-24 px-6 relative z-20 max-w-xl mx-auto font-sans">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Abstract metallic backdrop grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />

        {status === 'success' ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold text-white">{t.successTitle}</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">{t.successDesc}</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/10 text-white transition-all cursor-pointer"
            >
              {lang === 'ar' ? 'إرسال استفسار آخر' : 'Send Another Request'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
                {t.heading}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {t.desc}
              </p>
            </div>

            {/* Error notifications */}
            {status === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 items-start text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">{t.nameLabel}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">{t.phoneLabel}</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                dir="ltr"
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors text-right"
              />
            </div>

            {/* Message Details */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400">{t.msgLabel}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.msgPlaceholder}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{status === 'loading' ? t.submitting : t.submitBtn}</span>
              <Send className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
