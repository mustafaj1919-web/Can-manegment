export interface Vehicle {
  id: string;
  nameAr: string;
  nameEn: string;
  typeAr: string;
  typeEn: string;
  priceUSD: number;
  horsepower: number;
  torque: number; // Nm
  rangeKM: number; // km
  batteryKWh: number; // kWh
  acceleration: string; // 0-100 km/h
  topSpeed: number; // km/h
  descriptionAr: string;
  descriptionEn: string;
  image: string; // fallback shape index or custom path
  featuresAr: string[];
  featuresEn: string[];
  specsAr: Record<string, string>;
  specsEn: Record<string, string>;
}

export const VEHICLES: Vehicle[] = [
  {
    id: 'byd-qin-plus',
    nameAr: 'بي واي دي تشين بلس (Qin Plus)',
    nameEn: 'BYD Qin Plus DM-i / EV',
    typeAr: 'سيدان ذكية متوسطة الحجم',
    typeEn: 'Smart Executive Sedan',
    priceUSD: 22000,
    horsepower: 197,
    torque: 325,
    rangeKM: 500,
    batteryKWh: 48,
    acceleration: '7.3s',
    topSpeed: 185,
    descriptionAr: 'السيارة الأكثر توفيراً للوقود والطاقة. بتصميم واجهتها الرياضي العريض ومقصورتها المريحة، توفر تشين بلس توازناً مثالياً في القيادة اليومية.',
    descriptionEn: 'The champion of efficiency and cost savings. Qin Plus delivers sleek design, smart driving assistance, and class-leading battery durability.',
    image: '0', 
    featuresAr: [
      'بطارية Blade فائقة الأمان والمقاومة للحرارة',
      'شاشة ترفيه مركزية دوارة قياس 10.1 بوصة',
      'نظام صوتي محيطي بـ 6 مكبرات صوت',
      'مثبت سرعة ذكي ونظام تحذير مغادرة المسار'
    ],
    featuresEn: [
      'Ultra-Safe Thermal Blade Battery Technology',
      '10.1" Rotating Infotainment Center Screen',
      '6-Speaker High-Fidelity Audio System',
      'Adaptive Cruise Control & Lane Departure Warning'
    ],
    specsAr: {
      'المحرك': 'محرك كهربائي ذكي متزامن بنظام المغناطيس الدائم',
      'القوة': '197 حصان',
      'عزم الدوران': '325 نيوتن متر',
      'المدى الكهربائي': '500 كم',
      'البطارية': '48 كيلوواط/ساعة Blade',
      'زمن الشحن': 'من 30% إلى 80% في 30 دقيقة (DC)'
    },
    specsEn: {
      'Powertrain': 'Permanent Magnet Synchronous Motor',
      'Horsepower': '197 HP',
      'Torque': '325 Nm',
      'Range': '500 KM',
      'Battery Capacity': '48 kWh Blade Battery',
      'Charging Time': '30% to 80% in 30 mins (Fast DC)'
    }
  },
  {
    id: 'byd-song-plus',
    nameAr: 'بي واي دي سونغ بلس (Song Plus)',
    nameEn: 'BYD Song Plus EV',
    typeAr: 'كروس اوفر عائلية مدمجة',
    typeEn: 'Compact Luxury C-SUV',
    priceUSD: 29000,
    horsepower: 218,
    torque: 330,
    rangeKM: 520,
    batteryKWh: 71,
    acceleration: '8.5s',
    topSpeed: 180,
    descriptionAr: 'كروس اوفر عائلية تجمع بين رحابة المساحة والتقنيات العصرية. تعتبر الخيار المفضل للعوائل الباحثة عن الراحة والأمان.',
    descriptionEn: 'A versatile family crossover blending high-tech features and space. Featuring the signature Dragon Face design and premium safety aids.',
    image: '1',
    featuresAr: [
      'لغة تصميم Dragon Face الجريئة والمستقبلية',
      'شاشة ذكية دوارة قياس 12.8 بوصة تدعم الاتصال',
      'سقف زجاجي بانورامي منزلق بالكامل',
      'نظام تنقية هواء المقصورة متطور PM2.5'
    ],
    featuresEn: [
      'Bold Dragon Face Exterior Design Identity',
      '12.8" Smart Rotatable Touchscreen Console',
      'Full Panoramic Sliding Glass Sunroof',
      'High-grade Cabin PM2.5 Air Purifying System'
    ],
    specsAr: {
      'المحرك': 'كهربائي ذكي AWD متزامن FWD',
      'القوة': '218 حصان',
      'عزم الدوران': '330 نيوتن متر',
      'المدى الكهربائي': '520 كم',
      'البطارية': '71.7 كيلوواط/ساعة Blade',
      'الخلوص الأرضي': '180 مم مناسب للشوارع المحلية'
    },
    specsEn: {
      'Powertrain': 'Front-Wheel Drive Electric Motor',
      'Horsepower': '218 HP',
      'Torque': '330 Nm',
      'Range': '520 KM',
      'Battery Capacity': '71.7 kWh Blade Battery',
      'Ground Clearance': '180mm (optimized for local roads)'
    }
  },
  {
    id: 'byd-han',
    nameAr: 'بي واي دي هان (Han EV)',
    nameEn: 'BYD Han EV Flagship',
    typeAr: 'سيدان فاخرة عالية الأداء',
    typeEn: 'Luxury Performance Sedan',
    priceUSD: 46000,
    horsepower: 517,
    torque: 700,
    rangeKM: 610,
    batteryKWh: 85,
    acceleration: '3.9s',
    topSpeed: 200,
    descriptionAr: 'السيارة الرائدة لـ BYD. تجمع بين فخامة المقصورة الجلدية والتسارع الرياضي المذهل مع توفير درجات حماية قصوى بفضل بطارية الـ Blade الفولاذية.',
    descriptionEn: 'BYD’s flagship luxury sedan. Experience extreme acceleration, Nappa leather craftsmanship, and structural safety with zero emission footprint.',
    image: '0',
    featuresAr: [
      'تسارع خارق من 0 إلى 100 كم/س في 3.9 ثانية فقط',
      'مقاعد نابا الفاخرة مع نظام تدليك وتدفئة وتهوية كاملة',
      'شاشة ملاحة مركزية دوارة فائقة الدقة قياس 15.6 بوصة',
      'نظام صوتي ديناميكي ديناوديو بـ 12 مكبر صوت'
    ],
    featuresEn: [
      'Extreme 0-100 km/h sprint in 3.9 seconds',
      'Premium Nappa Leather Massage Heated/Ventilated Seats',
      '15.6" UHD Rotatable Intelligent Screen Console',
      '12-Speaker Custom Dynaudio Surround System'
    ],
    specsAr: {
      'المحرك': 'دفع كلي مستمر AWD ذو دفع كهربائي مزدوج',
      'القوة': '517 حصان',
      'عزم الدوران': '700 نيوتن متر',
      'المدى الكهربائي': '610 كم',
      'البطارية': '85.4 كيلوواط/ساعة Blade',
      'نظام الفرملة': 'مكابح رياضية بريمبو إيطالية عالية الاستجابة'
    },
    specsEn: {
      'Powertrain': 'Dual-Motor AWD Performance Drive',
      'Horsepower': '517 HP',
      'Torque': '700 Nm',
      'Range': '610 KM',
      'Battery Capacity': '85.4 kWh Blade Battery',
      'Braking System': 'Brembo Sport Calipers High-Performance'
    }
  },
  {
    id: 'byd-tang',
    nameAr: 'بي واي دي تانغ (Tang SUV)',
    nameEn: 'BYD Tang EV (7 Seats)',
    typeAr: 'سيارة عائلية فاخرة بـ 7 مقاعد',
    typeEn: 'Luxury 7-Passenger SUV',
    priceUSD: 52000,
    horsepower: 510,
    torque: 680,
    rangeKM: 565,
    batteryKWh: 108,
    acceleration: '4.4s',
    topSpeed: 180,
    descriptionAr: 'سيارة SUV عائلية فاخرة تتسع لـ 7 ركاب في 3 صفوف. بفضل هيكلها الصلب والمحرك المزدوج، تقدم أداءً قوياً على الكثبان الرملية والطرق السريعة.',
    descriptionEn: 'The spacious family flagship. Fitting 7 passengers across three premium rows with dual-motor stability, intelligent ADAS shields, and dual zone AC.',
    image: '1',
    featuresAr: [
      'مقصورة رحبة تتسع لـ 7 ركاب بـ 3 صفوف من الجلد الفخم',
      'نظام DiPilot المتطور لمساعدة السائق ورادارات القيادة',
      'شاشة ملاحة متحركة دوارة قياس 15.6 بوصة',
      'مكيف هواء ذكي ثلاثي المناطق مع فلتر حماية هواء صحي'
    ],
    featuresEn: [
      'Presidential 3-Row 7-Passenger Leather Layout',
      'DiPilot ADAS Intelligent Co-Pilot Radar Cruise',
      '15.6" Rotating Central Entertainment Panel',
      'Three-Zone Adaptive Automatic AC with PM2.5 filtration'
    ],
    specsAr: {
      'المحرك': 'ثنائي المحرك AWD دفع كلي ذكي',
      'القوة': '510 حصان',
      'عزم الدوران': '680 نيوتن متر',
      'المدى الكهربائي': '565 كم',
      'البطارية': '108.8 كيلوواط/ساعة Blade سعة ضخمة',
      'سعة الصندوق': '940 لتر عند طي الصف الثالث'
    },
    specsEn: {
      'Powertrain': 'Dual-Motor AWD SUV Chassis',
      'Horsepower': '510 HP',
      'Torque': '680 Nm',
      'Range': '565 KM',
      'Battery Capacity': '108.8 kWh Blade Battery',
      'Cargo Volume': '940L (third row folded)'
    }
  },
  {
    id: 'byd-seal',
    nameAr: 'بي واي دي سيل (Seal)',
    nameEn: 'BYD Seal EV Sport',
    typeAr: 'سيدان رياضية سريعة',
    typeEn: 'High-Performance Sport Sedan',
    priceUSD: 39000,
    horsepower: 530,
    torque: 670,
    rangeKM: 570,
    acceleration: '3.8s',
    batteryKWh: 82,
    topSpeed: 215,
    descriptionAr: 'التناغم بين جماليات المحيط والرياضيات الصرفة. تتميز سيل بهندسة هيكل متطورة CTB تدمج البطارية بالكامل في الهيكل لتوفير أفضل ثبات وتحكم.',
    descriptionEn: 'Ocean Aesthetics meets racing physics. BYD Seal utilizes Cell-to-Body (CTB) engineering integrating the battery directly into the structural frame.',
    image: '2',
    featuresAr: [
      'هندسة متطورة لدمج البطارية بالهيكل (Cell-to-Body)',
      'سقف بانورامي عازل للحرارة والأشعة فوق البنفسجية',
      'شاشة ترفيه مركزية دوارة قياس 15.6 بوصة تدعم اللمس',
      'نظام تعليق نشط ذكي للتحكم بالثبات FSD'
    ],
    featuresEn: [
      'Cell-to-Body (CTB) Structural Integrity Concept',
      'UV & Heat Guard Glazed Panoramic Roof panel',
      '15.6" Rotatable Responsive Command Console',
      'Frequency Selective Damping (FSD) active suspension'
    ],
    specsAr: {
      'المحرك': 'كهربائي ثنائي AWD للسباقات الرياضية',
      'القوة': '530 حصان',
      'عزم الدوران': '670 نيوتن متر',
      'المدى الكهربائي': '570 كم',
      'البطارية': '82.5 كيلوواط/ساعة Blade',
      'توزيع الوزن': 'توزيع مثالي 50:50 بين الأمام والخلف'
    },
    specsEn: {
      'Powertrain': 'Performance Dual-Motor AWD',
      'Horsepower': '530 HP',
      'Torque': '670 Nm',
      'Range': '570 KM',
      'Battery Capacity': '82.5 kWh Blade Battery',
      'Weight Balance': 'Perfect 50:50 Front-to-Rear load'
    }
  },
  {
    id: 'byd-seagull',
    nameAr: 'بي واي دي سيغال (Seagull)',
    nameEn: 'BYD Seagull Hatchback',
    typeAr: 'هاتشباك شبابية ذكية للمدينة',
    typeEn: 'Compact Smart Urban Hatchback',
    priceUSD: 14000,
    horsepower: 75,
    torque: 135,
    rangeKM: 405,
    batteryKWh: 38,
    acceleration: '12.0s',
    topSpeed: 130,
    descriptionAr: 'السيارة الكهربائية المدمجة الأفضل قيمة للشراء. مثالية للشوارع المزدحمة بفضل حجمها العملي واستهلاكها المتناهي الصغر للطاقة وسهولة ركنها.',
    descriptionEn: 'The value champion for modern cities. Extremely easy to maneuver, park, and charge, without sacrificing advanced smart safety features.',
    image: '2',
    featuresAr: [
      'حجم خارجي مدمج مع رحابة مقصورة داخلية ممتازة',
      'شاشة ترفيه دوارة قياس 10.1 بوصة تدعم الاتصال بالهاتف',
      'نظام شحن سريع يشحن البطارية بالكامل في 40 دقيقة',
      'هيكل فولاذي متين مدعم بوسائد هوائية محيطية'
    ],
    featuresEn: [
      'Smart Compact Footprint with clever inner room',
      '10.1" Smart Rotatable Touchscreen Navigation',
      'Fast DC recharge to full capacity in 40 mins',
      'High-strength Steel Body frame with complete airbags'
    ],
    specsAr: {
      'المحرك': 'محرك كهربائي ذكي أمامي متزامن',
      'القوة': '75 حصان',
      'عزم الدوران': '135 نيوتن متر',
      'المدى الكهربائي': '405 كم',
      'البطارية': '38.8 كيلوواط/ساعة Blade حماية',
      'الوزن': 'خفيفة الوزن للقيادة الرشيقة'
    },
    specsEn: {
      'Powertrain': 'Front Permanent Magnet Motor',
      'Horsepower': '75 HP',
      'Torque': '135 Nm',
      'Range': '405 KM',
      'Battery Capacity': '38.8 kWh Blade Battery',
      'Vehicle Weight': 'Lightweight and nimble chassis'
    }
  }
];
