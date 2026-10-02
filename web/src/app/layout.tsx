import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource-variable/figtree/wght.css'
import '@fontsource/caveat/latin-600.css'
import 'leaflet/dist/leaflet.css'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { isDemoMode } from '@/db'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { TabBar } from '@/components/TabBar'
import { siteUrl } from '@/lib/site'
import { unreadCount } from '@/server/queries'
import { getViewer } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('title'), template: '%s · Rondje' },
    description: t('description'),
    applicationName: 'Rondje',
    manifest: '/manifest.webmanifest',
    icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
    openGraph: { title: t('title'), description: t('description'), images: ['/og.png'], siteName: 'Rondje', type: 'website' },
    twitter: { card: 'summary_large_image' },
    appleWebApp: { capable: true, title: 'Rondje', statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1310' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const viewer = await getViewer()
  const t = await getTranslations()
  const unread = viewer ? await unreadCount(viewer.userId) : 0
  const tabs = viewer?.profile
    ? [
        { href: '/dogs', label: t('nav.dogs'), icon: 'paw' as const },
        { href: '/requests', label: t('nav.requests'), icon: 'route' as const, badge: unread },
        viewer.orgs[0]
          ? { href: `/shelter/${viewer.orgs[0].id}`, label: t('nav.shelter'), icon: 'building' as const }
          : { href: '/my-dogs', label: t('nav.myDogs'), icon: 'home' as const },
        { href: '/profile', label: t('nav.profile'), icon: 'user' as const },
      ]
    : null

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <div className={`shell${tabs ? ' has-tabbar' : ''}`}>
            <a href="#main" className="skip-link">
              {t('nav.skip')}
            </a>
            {isDemoMode() ? <div className="demo-banner">{t('footer.demo')}</div> : null}
            <Header viewer={viewer} />
            <main className="main" id="main">
              {children}
            </main>
            <Footer />
            {tabs ? <TabBar tabs={tabs} /> : null}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
