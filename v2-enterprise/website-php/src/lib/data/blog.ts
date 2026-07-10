import type { NewsPost } from "@/lib/types";

export const BLOG_POSTS: NewsPost[] = [
  {
    slug: "ev-ownership-guide-iraq",
    titleEn: "A First-Time EV Owner's Guide for Iraq",
    titleAr: "دليل المالك الجديد للسيارات الكهربائية في العراق",
    excerptEn: "Everything you need to know before switching from a gasoline car to a BYD electric vehicle.",
    excerptAr: "كل ما تحتاج معرفته قبل الانتقال من سيارة بنزين إلى سيارة BYD الكهربائية.",
    bodyEn: [
      "Switching to an electric vehicle is a bigger mindset shift than a mechanical one. The most common question we hear is about range anxiety — and the honest answer is that with 400-600+ km of range across the BYD lineup, most daily driving in Baghdad, Erbil, or Basra uses only a fraction of a full charge.",
      "Home charging is the foundation of EV ownership. A standard 7kW home charger, installed by our certified partners, can fully charge most BYD models overnight.",
      "For longer trips between cities, our showroom DC fast chargers can take a battery from 30% to 80% in as little as 26 minutes — about the time for a coffee break.",
    ],
    bodyAr: [
      "الانتقال إلى سيارة كهربائية هو تحول في العقلية أكثر منه تحولاً ميكانيكياً. أكثر سؤال نسمعه هو عن قلق نفاد البطارية — والإجابة الصادقة هي أنه مع مدى يتجاوز 400-600 كم عبر تشكيلة BYD، تستهلك معظم القيادة اليومية في بغداد أو أربيل أو البصرة جزءاً صغيراً فقط من الشحنة الكاملة.",
      "الشحن المنزلي هو أساس امتلاك سيارة كهربائية. يمكن لشاحن منزلي قياسي بقدرة 7 كيلوواط، يركّبه شركاؤنا المعتمدون، شحن معظم طرازات BYD بالكامل خلال الليل.",
      "للرحلات الأطول بين المدن، يمكن لمحطات الشحن السريع في معارضنا رفع شحن البطارية من 30% إلى 80% خلال 26 دقيقة فقط — تقريباً وقت استراحة قهوة.",
    ],
    date: "2026-05-28",
    category: "Guide",
    image: "/blog/ev-guide.jpg",
  },
  {
    slug: "blade-battery-explained",
    titleEn: "Blade Battery Explained: Why It's the Safest in the Industry",
    titleAr: "شرح بطارية Blade: لماذا هي الأكثر أماناً في الصناعة",
    excerptEn: "A deep dive into the engineering behind BYD's famous nail-penetration test.",
    excerptAr: "نظرة معمقة على الهندسة وراء اختبار اختراق المسمار الشهير لدى BYD.",
    bodyEn: [
      "Most EV battery fires start with thermal runaway — a chain reaction where one damaged cell heats its neighbors until the whole pack ignites. BYD's Blade Battery uses Lithium Iron Phosphate (LFP) chemistry, which is inherently far more stable than the nickel-based chemistries used in many competitors.",
      "In BYD's now-famous test, a steel nail is driven directly through a fully charged Blade Battery cell. Rather than catching fire, the cell shows only a slight surface temperature increase — no smoke, no flame.",
      "This safety margin is why Al-Sadaka Motors backs every Blade Battery with an 8-year warranty.",
    ],
    bodyAr: [
      "معظم حرائق بطاريات السيارات الكهربائية تبدأ بانفجار حراري — تفاعل متسلسل حيث تسخّن خلية تالفة الخلايا المجاورة حتى تشتعل الحزمة بأكملها. تستخدم بطارية Blade من BYD كيمياء فوسفات حديد الليثيوم (LFP)، وهي أكثر استقراراً بطبيعتها من الكيمياء المعتمدة على النيكل المستخدمة لدى الكثير من المنافسين.",
      "في اختبار BYD الشهير، يُدفع مسمار فولاذي مباشرة عبر خلية بطارية Blade مشحونة بالكامل. وبدلاً من الاشتعال، تُظهر الخلية ارتفاعاً طفيفاً فقط في درجة حرارة السطح — بدون دخان أو لهب.",
      "هامش الأمان هذا هو سبب دعم الأصدقاء للسيارات لكل بطارية Blade بضمان 8 سنوات.",
    ],
    date: "2026-05-10",
    category: "Technology",
    image: "/blog/blade-battery.jpg",
  },
  {
    slug: "financing-vs-cash",
    titleEn: "Financing vs. Cash: Which Is Right for Your Next BYD?",
    titleAr: "التمويل أم الدفع النقدي: أيهما مناسب لسيارتك القادمة؟",
    excerptEn: "A practical breakdown of the pros and cons of each path to ownership.",
    excerptAr: "تحليل عملي لإيجابيات وسلبيات كل طريق نحو التملك.",
    bodyEn: [
      "Paying cash means no interest and full ownership from day one — ideal if you have the liquidity and want to avoid monthly commitments.",
      "Financing spreads the cost over time and can free up capital for other investments, especially with our current 0% down payment offers on select models.",
      "Our finance calculator lets you compare scenarios instantly — try adjusting the down payment and term to see how your monthly payment changes.",
    ],
    bodyAr: [
      "الدفع النقدي يعني عدم وجود فوائد وامتلاكاً كاملاً من اليوم الأول — مثالي إذا كانت لديك السيولة وتريد تجنب الالتزامات الشهرية.",
      "يوزّع التمويل التكلفة على فترة زمنية ويمكن أن يحرر رأس المال لاستثمارات أخرى، خاصة مع عروضنا الحالية بدون دفعة أولى على طرازات مختارة.",
      "تتيح لك حاسبة التمويل لدينا مقارنة السيناريوهات فورياً — جرّب تعديل الدفعة الأولى والمدة لترى كيف يتغير قسطك الشهري.",
    ],
    date: "2026-04-22",
    category: "Finance",
    image: "/blog/financing.jpg",
  },
];
