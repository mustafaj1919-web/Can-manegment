'use client';

import React, { useState, useEffect } from 'react';
import { useShowroomStore } from '@/store/useStore';
import { Volume2, VolumeX, Globe, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function Navbar() {
  const lang = useShowroomStore((state) => state.lang);
  const setLang = useShowroomStore((state) => state.setLang);
  const soundEnabled = useShowroomStore((state) => state.soundEnabled);
  const toggleSound = useShowroomStore((state) => state.toggleSound);
  const isDriving = useShowroomStore((state) => state.isDriving);

  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide/Show navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setVisible(false); // scrolling down
      } else {
        setVisible(true); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (isDriving) return null; // Hide navigation during active test drive

  const menuItems = [
    { labelAr: 'الرئيسية', labelEn: 'Home', href: '/' },
    { labelAr: 'الأسطول', labelEn: 'Inventory', href: '/inventory' },
    { labelAr: 'التقنيات والسلامة', labelEn: 'Technology', href: '/technology' },
    { labelAr: 'حاسبة التقسيط', labelEn: 'Financing', href: '/financing' },
    { labelAr: 'مقارنة', labelEn: 'Compare', href: '/compare' },
    { labelAr: 'من نحن', labelEn: 'About', href: '/about' },
    { labelAr: 'اتصل بنا', labelEn: 'Contact', href: '/contact' },
  ];

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 inset-x-0 z-50 px-6 py-4 pointer-events-auto font-sans"
    >
      <div className="max-w-7xl mx-auto rounded-2xl glass-panel-heavy px-6 py-3 flex justify-between items-center border border-white/5">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center font-extrabold text-white tracking-tighter text-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            B
          </span>
          <span className="font-black text-sm tracking-widest text-white uppercase hidden sm:inline-block">
            {lang === 'ar' ? 'أريج نينوى BYD' : 'Areej Nineveh BYD'}
          </span>
        </Link>

        {/* Desktop Menu links */}
        <div className="hidden md:flex items-center gap-6">
          {menuItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors tracking-wide uppercase"
            >
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>

        {/* Global Action items */}
        <div className="flex items-center gap-4">
          {/* Sound Mute/Play */}
          <button
            onClick={toggleSound}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-white/5 cursor-pointer"
            title={lang === 'ar' ? 'مؤثرات الصوت' : 'Sound Effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          {/* Ltr/Rtl Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase">{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 bg-white/5 rounded-xl text-gray-400 border border-white/5 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 inset-x-6 glass-panel-heavy rounded-2xl p-6 border border-white/10 flex flex-col gap-4 md:hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            {menuItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-300 hover:text-white border-b border-white/5 pb-2 transition-colors"
              >
                {lang === 'ar' ? item.labelAr : item.labelEn}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
