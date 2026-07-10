export type Locale = "en" | "ar";

export interface Dictionary {
  nav: {
    vehicles: string;
    technology: string;
    finance: string;
    offers: string;
    compare: string;
    testDrive: string;
    tradeIn: string;
    news: string;
    blog: string;
    gallery: string;
    about: string;
    locations: string;
    contact: string;
    faq: string;
    electric: string;
    battery: string;
    charging: string;
    installments: string;
  };
  cta: {
    exploreVehicles: string;
    bookTestDrive: string;
    calculateFinance: string;
    viewDetails: string;
    downloadBrochure: string;
    whatsapp: string;
    getOffer: string;
    contactUs: string;
    learnMore: string;
    seeAll: string;
  };
  common: {
    from: string;
    startingAt: string;
    range: string;
    topSpeed: string;
    acceleration: string;
    battery: string;
    power: string;
    loading: string;
    currency: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      vehicles: "Vehicles",
      technology: "Technology",
      finance: "Finance",
      offers: "Offers",
      compare: "Compare",
      testDrive: "Book Test Drive",
      tradeIn: "Trade In",
      news: "News",
      blog: "Blog",
      gallery: "Gallery",
      about: "About Us",
      locations: "Locations",
      contact: "Contact",
      faq: "FAQ",
      electric: "Electric Technology",
      battery: "Battery Technology",
      charging: "Charging Solutions",
      installments: "Installments",
    },
    cta: {
      exploreVehicles: "Explore Vehicles",
      bookTestDrive: "Book a Test Drive",
      calculateFinance: "Calculate Payments",
      viewDetails: "View Details",
      downloadBrochure: "Download Brochure",
      whatsapp: "Chat on WhatsApp",
      getOffer: "Get an Offer",
      contactUs: "Contact Us",
      learnMore: "Learn More",
      seeAll: "See All",
    },
    common: {
      from: "From",
      startingAt: "Starting at",
      range: "Range",
      topSpeed: "Top Speed",
      acceleration: "0–100 km/h",
      battery: "Battery",
      power: "Power",
      loading: "Loading",
      currency: "$",
    },
  },
  ar: {
    nav: {
      vehicles: "السيارات",
      technology: "التقنيات",
      finance: "التمويل",
      offers: "العروض",
      compare: "المقارنة",
      testDrive: "احجز تجربة قيادة",
      tradeIn: "استبدال سيارتك",
      news: "الأخبار",
      blog: "المدونة",
      gallery: "المعرض",
      about: "من نحن",
      locations: "فروعنا",
      contact: "تواصل معنا",
      faq: "الأسئلة الشائعة",
      electric: "التقنية الكهربائية",
      battery: "تقنية البطاريات",
      charging: "حلول الشحن",
      installments: "الأقساط",
    },
    cta: {
      exploreVehicles: "استكشف السيارات",
      bookTestDrive: "احجز تجربة قيادة",
      calculateFinance: "احسب القسط",
      viewDetails: "عرض التفاصيل",
      downloadBrochure: "تحميل الكتالوج",
      whatsapp: "تواصل عبر واتساب",
      getOffer: "احصل على عرض",
      contactUs: "تواصل معنا",
      learnMore: "اعرف المزيد",
      seeAll: "عرض الكل",
    },
    common: {
      from: "تبدأ من",
      startingAt: "تبدأ من",
      range: "المدى",
      topSpeed: "السرعة القصوى",
      acceleration: "0–100 كم/س",
      battery: "البطارية",
      power: "القوة",
      loading: "جارِ التحميل",
      currency: "$",
    },
  },
};
