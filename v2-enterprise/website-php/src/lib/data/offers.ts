export interface Offer {
  id: string;
  vehicleId: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  expiry: string;
  badge: string;
}

export const OFFERS: Offer[] = [
  {
    id: "seagull-launch",
    vehicleId: "byd-seagull",
    titleEn: "0% Down Payment on the Seagull",
    titleAr: "بدون دفعة أولى على سيغال",
    descEn: "Drive away in a brand-new Seagull with zero down payment and 48-month terms.",
    descAr: "اقتنِ سيغال جديدة كلياً بدون دفعة أولى وبتقسيط يصل إلى 48 شهراً.",
    expiry: "2026-08-31",
    badge: "0% Down",
  },
  {
    id: "song-plus-service",
    vehicleId: "byd-song-plus",
    titleEn: "Free 3-Year Service Package",
    titleAr: "باقة صيانة مجانية لثلاث سنوات",
    descEn: "Every Song Plus purchased this quarter includes complimentary scheduled maintenance.",
    descAr: "كل سونغ بلس تُشترى هذا الربع تشمل صيانة دورية مجانية.",
    expiry: "2026-09-30",
    badge: "Free Service",
  },
  {
    id: "han-trade-bonus",
    vehicleId: "byd-han",
    titleEn: "Extra $1,500 Trade-In Bonus",
    titleAr: "مكافأة استبدال إضافية 1,500$",
    descEn: "Trade in any vehicle toward a new Han EV and receive an additional valuation bonus.",
    descAr: "استبدل أي سيارة بهان EV جديدة واحصل على مكافأة تقييم إضافية.",
    expiry: "2026-08-15",
    badge: "Trade Bonus",
  },
];
