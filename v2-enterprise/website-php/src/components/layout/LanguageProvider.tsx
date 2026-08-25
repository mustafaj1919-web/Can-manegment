'use client';

import React, { useEffect } from 'react';
import { useShowroomStore } from '@/store/useStore';

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useShowroomStore((state) => state.lang);

  useEffect(() => {
    // Set html attributes dynamically based on current language
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    // Apply appropriate class on body
    if (lang === 'ar') {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
      document.body.style.fontFamily = "var(--font-tajawal), var(--font-outfit), sans-serif";
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
      document.body.style.fontFamily = "var(--font-outfit), var(--font-tajawal), sans-serif";
    }
  }, [lang]);

  return <>{children}</>;
}
