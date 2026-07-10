'use client';

import React from 'react';
import { useShowroomStore } from '@/store/useStore';
import { MessageCircle } from 'lucide-react';

export default function Footer() {
  const lang = useShowroomStore((state) => state.lang);
  const isDriving = useShowroomStore((state) => state.isDriving);

  if (isDriving) return null;

  return (
    <footer className="py-12 border-t border-white/5 bg-black/40 backdrop-blur-md relative z-20 font-sans text-center px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-gray-500 text-xs sm:text-sm">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            B
          </span>
          <span className="font-bold text-white uppercase tracking-wider">
            {lang === 'ar' ? 'شركة أريج نينوى وكيل BYD في العراق' : 'Areej Nineveh BYD Iraq'}
          </span>
        </div>

        {/* Note */}
        <div className="text-[11px] leading-relaxed max-w-md text-gray-600">
          {lang === 'ar' 
            ? 'موقع إلكتروني تفاعلي لعرض وتخصيص سيارات BYD ثلاثية الأبعاد. خاضع لشروط تعاقد الوكالة الرسمية.' 
            : 'Interactive showroom portal for BYD 3D customization. All prices and terms subject to official dealer conditions.'}
        </div>

        {/* WhatsApp & Social anchor */}
        <div className="flex gap-4">
          <a
            href="https://wa.me/9647719681434"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="hud-value font-bold">07719681434</span>
          </a>
          <span className="text-gray-800">|</span>
          <span>© {new Date().getFullYear()} {lang === 'ar' ? 'أريج نينوى BYD' : 'Areej Nineveh BYD'}</span>
        </div>

      </div>
    </footer>
  );
}
