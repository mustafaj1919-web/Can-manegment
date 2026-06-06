import '../styles/globals.css'
import { Providers } from '../lib/providers'
import { AppShell } from '../components/layout/AppShell'

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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
