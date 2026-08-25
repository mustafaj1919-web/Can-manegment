'use client';

import React, { useState } from 'react';
import { useShowroomStore } from '@/store/useStore';
import { MapPin, Phone, Clock, ExternalLink } from 'lucide-react';


export default function ShowroomMap() {
  const lang = useShowroomStore((state) => state.lang);
  const [activeBranch, setActiveBranch] = useState<'krayat' | 'service'>('krayat');

  const content = {
    ar: {
      title: 'فروعنا وصالات العرض',
      sub: 'تفضل بزيارتنا لتجربة قيادة حقيقية ومعاينة السيارات على أرض الواقع في بغداد',
      addressTitle: 'العنوان الرسمي',
      addressDetail: 'بغداد / الكريعات / شارع الوقف السني / قرب كلية القانون',
      hoursTitle: 'أوقات العمل',
      hoursDetail: 'السبت - الخميس: 9:00 صباحاً - 9:00 مساءً',
      contactTitle: 'خطوط التواصل المباشر',
      directions: 'افتح في خرائط جوجل',
      serviceTitle: 'مركز الصيانة والدعم الفني',
      serviceDetail: 'بغداد / الكريعات / الشارع الرئيسي',
      showroomName: 'صالة عرض الكريعات الرئيسية',
      centerName: 'مركز الدعم الفني والصيانة الفورية',
    },
    en: {
      title: 'Our Showrooms & Centers',
      sub: 'Visit our locations in Baghdad to inspect cars in person and take real-world test drives',
      addressTitle: 'Official Address',
      addressDetail: 'Baghdad / Krayat / Sunni Endowment St / Near Law College',
      hoursTitle: 'Opening Hours',
      hoursDetail: 'Saturday - Thursday: 9:00 AM - 9:00 PM',
      contactTitle: 'Direct Phone Lines',
      directions: 'Open in Google Maps',
      serviceTitle: 'Technical Support & Service Center',
      serviceDetail: 'Baghdad / Krayat / Main Street',
      showroomName: 'Main Krayat Showroom',
      centerName: 'Al-Sadaka Tech & Maintenance Hub',
    }
  };

  const t = content[lang];

  const contactLines = [
    { nameAr: 'أبو علي', nameEn: 'Abu Ali', phone: '07719681434' },
    { nameAr: 'علي', nameEn: 'Ali', phone: '07718752333' },
    { nameAr: 'سجاد', nameEn: 'Sajjad', phone: '07852525256' },
  ];

  return (
    <section id="showroom" className="py-24 px-6 max-w-7xl mx-auto font-sans relative z-20">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
          {t.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
          {t.sub}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Branch selectors & info (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
            <button
              onClick={() => setActiveBranch('krayat')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeBranch === 'krayat' ? 'bg-amber-500 text-black shadow-lg font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'صالة العرض' : 'Showroom'}
            </button>
            <button
              onClick={() => setActiveBranch('service')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeBranch === 'service' ? 'bg-amber-500 text-black shadow-lg font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'مركز الصيانة' : 'Service Hub'}
            </button>
          </div>

          {/* Info Card */}
          <div className="flex-1 glass-panel p-8 rounded-3xl flex flex-col justify-between border border-white/5">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] text-gold font-bold uppercase tracking-widest block mb-1">
                  {activeBranch === 'krayat' ? 'Main Showroom' : 'Support Hub'}
                </span>
                <h3 className="text-xl font-bold text-white">
                  {activeBranch === 'krayat' ? t.showroomName : t.centerName}
                </h3>
              </div>

              {/* Address */}
              <div className="flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-0.5">{t.addressTitle}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {activeBranch === 'krayat' ? t.addressDetail : t.serviceDetail}
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex gap-3 items-start">
                <Clock className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-0.5">{t.hoursTitle}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{t.hoursDetail}</p>
                </div>
              </div>

              {/* Contacts */}
              <div className="flex gap-3 items-start">
                <Phone className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div className="w-full">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{t.contactTitle}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {contactLines.map((line, index) => (
                      <a
                        key={index}
                        href={`tel:${line.phone}`}
                        className="flex justify-between items-center px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs text-gray-300 hover:text-white transition-colors"
                      >
                        <span className="font-semibold">{lang === 'ar' ? line.nameAr : line.nameEn}</span>
                        <span className="hud-value font-bold tracking-tighter">{line.phone}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps link */}
            <div className="pt-8 border-t border-white/5">
              <a
                href="https://maps.google.com/?q=شركة+الأصدقاء+لتجارة+السيارات+الكريعات"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white hover:text-gold hover:border-gold font-bold transition-all text-center"
              >
                <span>{t.directions}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Vector map visualization (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-white/5 overflow-hidden relative min-h-[380px] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          
          {/* Cyberpunk Map SVG Grid background */}
          <div className="absolute inset-0 opacity-15">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Styled SVG map representation of Baghdad river curves and pin */}
          <svg className="w-4/5 h-4/5 text-gray-800" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* River Tigris curve (neon blue) */}
            <path 
              d="M10 280 C80 270 120 220 110 150 C100 80 180 50 250 80 C320 110 330 200 390 190" 
              stroke="#2563eb" 
              strokeWidth="6" 
              strokeLinecap="round" 
              opacity="0.4"
            />
            {/* Baghdad Highway lines */}
            <path d="M50 10 L350 290" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <path d="M10 120 L390 120" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            
            {/* Main Showroom Location Point (pulse animation simulation) */}
            <g transform={activeBranch === 'krayat' ? 'translate(220, 90)' : 'translate(140, 150)'}>
              {/* Outer pulsing ring */}
              <circle r="14" fill={activeBranch === 'krayat' ? 'var(--accent-gold)' : 'var(--accent-blue)'} className="animate-ping" opacity="0.15" />
              {/* Core glow */}
              <circle r="6" fill={activeBranch === 'krayat' ? 'var(--accent-gold)' : 'var(--accent-blue)'} />
              <circle r="2" fill="#fff" />
            </g>

            {/* Inactive point */}
            <g transform={activeBranch === 'krayat' ? 'translate(140, 150)' : 'translate(220, 90)'} opacity="0.4">
              <circle r="4" fill="gray" />
            </g>
            
            {/* Label texts on SVG */}
            <text x="235" y="85" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
              {lang === 'ar' ? 'الكريعات / صالة العرض' : 'Krayat Showroom'}
            </text>
            <text x="100" y="170" fill="gray" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
              {lang === 'ar' ? 'مركز الخدمة' : 'Service Hub'}
            </text>
            <text x="35" y="270" fill="rgba(255,255,255,0.2)" fontSize="10" fontWeight="bold">TIGRIS RIVER</text>
          </svg>

          {/* Floating UI Coordinates info */}
          <div className="absolute bottom-4 right-4 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl font-mono text-[10px] text-gray-400">
            LOC: 33.3768° N, 44.3644° E
          </div>
        </div>

      </div>
    </section>
  );
}
