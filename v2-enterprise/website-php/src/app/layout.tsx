import type { Metadata, Viewport } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/context";
import { BRAND } from "@/lib/data/locations";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileActionBar from "@/components/layout/MobileActionBar";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const siteUrl = "https://www.alsadaka.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND.nameEn} | ${BRAND.nameAr}`,
    template: `%s | ${BRAND.nameEn}`,
  },
  description:
    "Al-Sadaka Motors — Baghdad's premier BYD electric vehicle showroom. Explore the full BYD lineup, calculate financing, book a test drive, and discover Blade Battery technology.",
  keywords: [
    "BYD Iraq",
    "شركة الأصدقاء لتجارة السيارات",
    "سيارات كهربائية العراق",
    "BYD Baghdad",
    "Electric Vehicles Iraq",
    "Blade Battery",
    "تقسيط سيارات كهربائية",
  ],
  authors: [{ name: BRAND.nameEn }],
  openGraph: {
    title: `${BRAND.nameEn} | ${BRAND.nameAr}`,
    description: "Baghdad's home of electric mobility — explore the full BYD lineup and book your test drive today.",
    type: "website",
    locale: "ar_IQ",
    alternateLocale: "en_US",
    siteName: BRAND.nameEn,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.nameEn,
    description: "Baghdad's home of electric mobility.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  name: BRAND.nameEn,
  alternateName: BRAND.nameAr,
  url: siteUrl,
  telephone: BRAND.phone,
  email: BRAND.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Baghdad",
    addressCountry: "IQ",
  },
  areaServed: "IQ",
  brand: { "@type": "Brand", name: "BYD" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ThemeProvider>
          <I18nProvider>
            <Navbar />
            <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
            <Footer />
            <MobileActionBar />
            <WhatsAppFloat />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
