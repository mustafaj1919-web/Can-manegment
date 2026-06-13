import '../styles/globals.css'
import { Providers } from '../lib/providers'
import { AppShell } from '../components/layout/AppShell'
import { CommandPalette } from '../components/shared/CommandPalette'
import { ShortcutsPanel } from '../components/shared/ShortcutsPanel'
import { Tajawal, Inter, JetBrains_Mono } from 'next/font/google'

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
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
    default: 'شركة الأصدقاء لتجارة السيارات',
    template: '%s — الأصدقاء',
  },
  description: 'نظام إدارة متكامل لمعارض السيارات',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`light ${tajawal.variable} ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <CommandPalette />
          <ShortcutsPanel />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
