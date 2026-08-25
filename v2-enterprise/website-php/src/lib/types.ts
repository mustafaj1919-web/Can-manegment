export type VehicleCategory = "sedan" | "suv" | "hatchback" | "performance";
export type VehicleBadge = "new" | "best-seller" | "flagship" | "value";

export interface VehicleColor {
  name: string;
  nameAr: string;
  hex: string;
}

export interface Vehicle {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  typeAr: string;
  typeEn: string;
  category: VehicleCategory;
  badges: VehicleBadge[];
  priceUSD: number;
  monthlyFromUSD: number;
  horsepower: number;
  torque: number;
  rangeKM: number;
  batteryKWh: number;
  acceleration: string;
  topSpeed: number;
  chargeTime: string;
  seats: number;
  descriptionAr: string;
  descriptionEn: string;
  heroImage: string;
  gallery: string[];
  colors: VehicleColor[];
  featuresAr: string[];
  featuresEn: string[];
  safetyAr: string[];
  safetyEn: string[];
  specsAr: Record<string, string>;
  specsEn: Record<string, string>;
  year: number;
}

export interface LeadPayload {
  type: "test-drive" | "trade-in" | "contact" | "finance" | "newsletter" | "brochure";
  name: string;
  phone: string;
  email?: string;
  vehicleId?: string;
  locationId?: string;
  preferredDate?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ShowroomLocation {
  id: string;
  nameEn: string;
  nameAr: string;
  cityEn: string;
  cityAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
  whatsapp: string;
  hoursEn: string;
  hoursAr: string;
  lat: number;
  lng: number;
}

export interface NewsPost {
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string;
  excerptAr: string;
  bodyEn: string[];
  bodyAr: string[];
  date: string;
  category: string;
  image: string;
}
