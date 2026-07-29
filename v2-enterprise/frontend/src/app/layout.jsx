import '../styles/globals.css'
import { Providers } from '../lib/providers'
import { AppShell } from '../components/layout/AppShell'
import { CommandPalette } from '../components/shared/CommandPalette'
import { ShortcutsPanel } from '../components/shared/ShortcutsPanel'
import { InstallPrompt } from '../components/pwa/InstallPrompt'
import { Tajawal, Inter, JetBrains_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google'

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
})

const plexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-receipt',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  title: {
    default: 'الأصدقاء للسيارات',
    template: '%s — الأصدقاء',
  },
  description: 'نظام إدارة متكامل لمعرض الأصدقاء للسيارات',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'الأصدقاء للسيارات',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-152x152.png',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${inter.variable} ${jetbrainsMono.variable} ${plexSansArabic.variable}`} suppressHydrationWarning>
      <head>
        {/* يشتغل قبل React لتجنب وميض الثيم وخطأ hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dashboardTheme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <CommandPalette />
          <ShortcutsPanel />
          <AppShell>{children}</AppShell>
          <InstallPrompt />
        </Providers>
        {/* Dedicated print target: on @media print, everything else on the page is hidden
            and only content portaled into this node is rendered. See ReceiptPrintPortal. */}
        <div id="print-root" />
      </body>
    </html>
  )
}
