'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useShowroomStore } from '@/store/useStore';
import { Zap, Sparkles, Compass, CreditCard, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function ScrollStory() {
  const lang = useShowroomStore((state) => state.lang);
  const setDriving = useShowroomStore((state) => state.setDriving);
  const isDriving = useShowroomStore((state) => state.isDriving);

  if (isDriving) return null; // Hide scroll overlays when driving

  const text = {
    ar: {
      heroTitle: 'تجربة قيادة بمستوى جديد',
      heroSub: 'صمّم واستكشف سيارة أحلامك من BYD في صالة العرض ثلاثية الأبعاد التفاعلية الأولى في العراق',
      scrollDown: 'مرر لأسفل للاكتشاف',
      
      sec1Title: 'جماليات التصميم - Dragon Face',
      sec1Desc: 'ندمج بين عراقة الفخامة التقليدية وهندسة الانسيابية العصرية بمقابض الأبواب المخفية وتجانس الخطوط الانسيابية الخاطفة للأنظار.',
      
      sec2Title: 'تقنية بطارية Blade الفائقة الأمان',
      sec2Desc: 'بطارية ثورية اجتازت اختبار المسمار الصارم دون تصاعد دخان أو اشتعال، مصممة خصيصاً للسلامة المطلقة وحمايتك في الظروف الشاقة.',
      
      sec3Title: 'شاشة ذكية دوارة قياس 15.6 بوصة',
      sec3Desc: 'مقصورة قيادة رقمية تفاعلية بالكامل، مزودة بشاشة مركزية تتحرك عمودياً أو أفقياً تلقائياً لتناسب ملاحة الطريق والترفيه.',
      
      sec4Title: 'طاقة نظيفة ومستقبل مستدام للعراق',
      sec4Desc: 'نمهد الطريق لبيئة عراقية أنقى مع سيارات هجينة وكهربائية رائدة تقدمها شركة أريج نينوى بأقساط مرنة تمتد لـ 10 أشهر.',
      
      testDriveBtn: 'ابدأ تجربة قيادة افتراضية 🏁'
    },
    en: {
      heroTitle: 'A New Level of Test-Driving',
      heroSub: 'Design and explore your dream BYD vehicle inside Iraq’s first interactive 3D virtual showroom',
      scrollDown: 'Scroll down to explore',
      
      sec1Title: 'Dragon Face Aesthetic Identity',
      sec1Desc: 'Blending traditional design cues with clean modern electric curves, featuring low-drag pop-out handles and a panoramic view.',
      
      sec2Title: 'Ultra-Safe Blade Battery Tech',
      sec2Desc: 'A revolutionary power cell passing the extreme needle puncture test with zero flames or smoke, optimized for safety and hot climates.',
      
      sec3Title: '15.6" Intelligent Rotating Console',
      sec3Desc: 'Take command of the cabin. The main display automatically rotates between portrait and landscape modes for smart driving.',
      
      sec4Title: 'Clean Energy for a Sustainable Iraq',
      sec4Desc: 'Paving the way for green mobility. Areej Nineveh offers premium hybrid & EV cars with flexible interest-free plans up to 10 months.',
      
      testDriveBtn: 'Start Virtual Test Drive 🏁'
    }
  };

  const t = text[lang];

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' as const } }
  };

  return (
    <div className="relative w-full z-20 pointer-events-none">
      
      {/* SECTION 1: HERO CONTAINER */}
      <section className="h-screen w-full flex flex-col justify-between items-center p-6 text-center">
        <div /> {/* spacing */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className="max-w-2xl bg-black/25 backdrop-blur-[2px] p-6 rounded-2xl"
        >
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-gold mb-4 inline-block tracking-wider uppercase">
            {lang === 'ar' ? 'معرض الأصدقاء الميتافيرس' : 'Al-Sadaka Metaverse'}
          </span>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight leading-tight gradient-text">
            {t.heroTitle}
          </h1>
          <p className="text-sm sm:text-lg text-gray-400 font-medium">
            {t.heroSub}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 pointer-events-auto">
            <Link
              href="/inventory"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-xs tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(212,175,55,0.25)] cursor-pointer"
            >
              {lang === 'ar' ? 'استكشف الأسطول 🏎️' : 'Explore Fleet 🏎️'}
            </Link>
            <Link
              href="/financing"
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-xs tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {lang === 'ar' ? 'احجز تجربة قيادة 📅' : 'Book Test Drive 📅'}
            </Link>
          </div>
        </motion.div>
        
        {/* Scroll indicator */}
        <div className="flex flex-col items-center gap-1 pb-8 text-gray-500">
          <span className="text-xs font-bold tracking-widest uppercase">{t.scrollDown}</span>
          <motion.div 
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronDown className="w-5 h-5 text-gold" />
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: PERFORMANCE & SHADERS */}
      <section className="min-h-screen w-full flex items-center justify-start p-6 sm:p-20">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-20%' }}
          variants={sectionVariants}
          className="w-full max-w-md glass-panel p-8 rounded-3xl space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t.sec1Title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{t.sec1Desc}</p>
        </motion.div>
      </section>

      {/* SECTION 3: POWERTRAIN */}
      <section className="min-h-screen w-full flex items-center justify-end p-6 sm:p-20">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-20%' }}
          variants={sectionVariants}
          className="w-full max-w-md glass-panel p-8 rounded-3xl space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t.sec2Title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{t.sec2Desc}</p>
        </motion.div>
      </section>

      {/* SECTION 4: INTERIOR & GESTURES */}
      <section className="min-h-screen w-full flex items-center justify-start p-6 sm:p-20">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-20%' }}
          variants={sectionVariants}
          className="w-full max-w-md glass-panel p-8 rounded-3xl space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t.sec3Title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{t.sec3Desc}</p>
        </motion.div>
      </section>

      {/* SECTION 5: INSTALLMENTS & DRIVE CTAS */}
      <section className="min-h-screen w-full flex flex-col justify-center items-center p-6 text-center">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-10%' }}
          variants={sectionVariants}
          className="w-full max-w-lg glass-panel p-8 rounded-3xl space-y-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-gold mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.sec4Title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto">{t.sec4Desc}</p>
          
          <div className="pt-4">
            <button
              onClick={() => setDriving(true)}
              className="pointer-events-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 transition-all text-sm tracking-wide cursor-pointer"
            >
              {t.testDriveBtn}
            </button>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
